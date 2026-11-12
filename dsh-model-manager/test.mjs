import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import {
  buildModelEntry,
  configuredModelProviders,
  DEFAULT_CONTEXT_WINDOW,
  fillModelFromHistory,
  historyModels,
  modelSettingsPath,
  validateModelDraft,
} from './model-data.js'
import { PROTOCOLS, saveNewProvider, validateApiKey, validateProviderDraft } from './provider-data.js'

const model = { id: 'model-a', name: 'Model A', contextWindow: 128_000, input: ['text'] }
const view = {
  writable: true,
  namespaces: [{
    ns: 'llm-pi-ai',
    revision: 7,
    value: { providers: { openai: { models: [model] }, anthropic: { models: [] } } },
  }],
}
const { providers } = configuredModelProviders([
  { provider: 'openai', displayName: 'OpenAI', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai'] },
  { provider: 'anthropic', displayName: 'Anthropic', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'anthropic'] },
  { provider: 'local', displayName: 'Local', settingsNs: 'other', settingsPath: ['providers', 'local'] },
], view)

assert.equal(providers.length, 2)
assert.deepEqual(modelSettingsPath(providers[0]), ['providers', 'openai', 'models'])
assert.deepEqual(historyModels(providers), [{ id: 'model-a', name: 'Model A' }])
const history = historyModels([
  { models: [{ ...model, apiKey: 'old-key', compat: { special: true } }, model] },
  { models: [{ ...model, name: 'Another name' }, { id: 'model-b' }, { id: '' }] },
])
assert.deepEqual(history, [{ id: 'model-a', name: 'Model A' }, { id: 'model-b', name: '' }])
const draftBeforeHistory = { id: 'draft', name: 'Draft', contextWindow: 64_000, imageSupport: false }
assert.deepEqual(fillModelFromHistory(draftBeforeHistory, history[0]), {
  id: 'model-a', name: 'Model A', contextWindow: 64_000, imageSupport: false,
})
assert.deepEqual(draftBeforeHistory, { id: 'draft', name: 'Draft', contextWindow: 64_000, imageSupport: false })
assert.deepEqual(buildModelEntry({
  id: 'new-model', name: 'New Model', contextWindow: DEFAULT_CONTEXT_WINDOW, imageSupport: true,
}), {
  id: 'new-model', name: 'New Model', contextWindow: 1_000_000, input: ['text', 'image'],
})
assert.deepEqual(buildModelEntry({
  ...fillModelFromHistory(draftBeforeHistory, history[0]),
  template: { ...model, apiKey: 'old-key', compat: { special: true } },
}), { id: 'model-a', name: 'Model A', contextWindow: 64_000, input: ['text'] })
assert.deepEqual(validateModelDraft({ id: ' next ', name: ' Next ', contextWindow: '1000000' }, []), {
  value: { id: 'next', name: 'Next', contextWindow: 1_000_000 },
})
assert.equal(validateModelDraft({ id: 'model-a', name: 'Duplicate', contextWindow: 1000 }, [model]).error, 'duplicateModel')
assert.equal(validateModelDraft({ id: 'bad', name: 'Bad', contextWindow: '1.5' }, []).error, 'contextWindowInvalid')
assert.throws(() => configuredModelProviders([], { namespaces: [], writable: 'yes' }), /writability/)

// 即使没有历史记录，也必须能读取新建所需 revision；占用 ID 包括停用/其他插件的提供商。
const empty = configuredModelProviders([], {
  writable: true,
  namespaces: [{ ns: 'llm-pi-ai', revision: 9, value: { providers: { dormant: {} } } }],
}, [{ id: 'active' }])
assert.deepEqual(empty.providers, [])
assert.equal(empty.revision, 9)
assert.deepEqual(empty.taken, ['active', 'dormant'])
assert.throws(() => configuredModelProviders([], { writable: true, namespaces: [] }), /unavailable/)

const providerDraft = {
  route: 'my-provider', displayName: ' My Provider ', baseURL: ' https://gateway.example/v1 ',
  api: 'openai-completions', apiKey: 'test-key',
}
const creation = {
  ...validateProviderDraft(providerDraft, []).value,
  revision: 9,
}
creation.profile.models = [buildModelEntry({ id: 'new', name: 'New', contextWindow: 1_000_000, imageSupport: true })]
assert.equal(creation.profile.apiKeyEnv, 'MY_PROVIDER_API_KEY')
assert.equal(creation.profile.baseURL, 'https://gateway.example/v1')
assert.equal(creation.profile.displayName, 'My Provider')
assert.equal(JSON.stringify(creation).includes('test-key'), false)
assert.equal(validateProviderDraft(providerDraft, ['my-provider']).error, 'routeTaken')
for (const route of ['', '1abc', 'UPPER', 'a_b', 'a--b', '-a', 'a-']) {
  assert.equal(validateProviderDraft({ ...providerDraft, route }, []).error, 'routeInvalid')
}
for (const baseURL of ['', 'ftp://example.com', 'https://user:pass@example.com', 'https://example.com?key=secret', 'https://example.com#x']) {
  assert.equal(validateProviderDraft({ ...providerDraft, baseURL }, []).error, 'baseURLInvalid')
}
for (const api of PROTOCOLS) {
  assert.ok(validateProviderDraft({ ...providerDraft, api, baseURL: 'http://localhost:8000/v1' }, []).value)
}
assert.equal(validateProviderDraft({ ...providerDraft, api: 'unknown' }, []).error, 'protocolInvalid')
assert.equal(validateApiKey(''), undefined)
assert.equal(validateApiKey(' test-key '), undefined)
for (const key of [' ', 'a b', 'test\nkey', '测试', 'API_KEY=abc', '"abc"', "'abc'"]) {
  assert.equal(validateApiKey(key), 'keyInvalid')
}

// 配置成功、凭据失败后，仅重试凭据；绝不把 API Key 放入 settings mutate。
const writes = []
const keys = []
let committed = false
const remote = {
  settings: { mutate: async (...args) => { writes.push(args); return { ok: true, value: {} } } },
  credentials: { set: async (...args) => { keys.push(args); return { ok: keys.length > 1, error: { message: 'secret must not be echoed' } } } },
}
assert.deepEqual(await saveNewProvider(remote, creation, ' test-key ', committed, () => { committed = true }), { stage: 'credentials' })
assert.equal(committed, true)
assert.deepEqual(await saveNewProvider(remote, creation, 'replacement-key', committed, () => assert.fail('duplicate commit')), { ok: true })
assert.equal(writes.length, 1)
assert.deepEqual(writes[0], ['llm-pi-ai', [{ op: 'set', path: ['providers', 'my-provider'], value: creation.profile }], 9])
assert.deepEqual(keys, [['MY_PROVIDER_API_KEY', 'test-key'], ['MY_PROVIDER_API_KEY', 'replacement-key']])

const conflict = { code: 'settings/conflict', message: 'conflict' }
assert.deepEqual(await saveNewProvider({
  settings: { mutate: async () => ({ ok: false, error: conflict }) },
  credentials: { set: async () => assert.fail('credentials must not change after settings conflict') },
}, creation, 'key', false, () => assert.fail('failed settings must not be marked committed')), { stage: 'settings', error: conflict })
assert.deepEqual(await saveNewProvider({ credentials: { set: async () => { throw new Error('secret') } } }, creation, 'key', true, () => {}), { stage: 'credentials' })
const noAuth = validateProviderDraft({ ...providerDraft, apiKey: '' }, []).value
assert.equal(Object.hasOwn(noAuth.profile, 'apiKeyEnv'), false)
assert.deepEqual(await saveNewProvider({ settings: remote.settings, credentials: {
  set: async () => assert.fail('an unauthenticated service must not store credentials'),
} }, { ...noAuth, revision: 9 }, '', false, () => {}), { ok: true })

const registrations = []
vm.runInNewContext(readFileSync(new URL('./client.js', import.meta.url), 'utf8'), {
  window: { __ModuleLoader__: { load: (entry) => registrations.push(entry) } },
})
assert.equal(registrations.length, 1)
assert.equal(registrations[0].id, 'dsh-model-manager')
let hookIndex = 0
const hookStates = [
  { loading: false, error: null, writable: true, providers: [{ ...providers[0], models: [model, model] }], taken: ['openai'], revision: 7 },
  'openai', 'existing', false, draftBeforeHistory, null, null, false,
]
const react = {
  Fragment: Symbol('Fragment'),
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState(initial) {
    const index = hookIndex++
    if (!(index in hookStates)) hookStates[index] = typeof initial === 'function' ? initial() : initial
    return [hookStates[index], (update) => { hookStates[index] = typeof update === 'function' ? update(hookStates[index]) : update }]
  },
  useRef: (value) => ({ current: value }),
  useCallback: (callback) => callback,
  useEffect() {},
}
const client = registrations[0].factory((specifier) => {
  if (specifier === 'react') return react
  if (specifier === '@deepseek-ai/dsh-client-ui-primitives') return { Button() {}, Modal() {} }
  throw new Error(`Unexpected client dependency: ${specifier}`)
})
assert.equal(typeof client.apply, 'function')
assert.deepEqual(Array.from(client.inject), ['slots', 'locale', 'remote', 'remote.llm', 'remote.settings', 'remote.credentials'])

// 直接触发客户端历史选择事件：列表只显示去重 ID，且不调用任何设置/凭据写入。
let Section
const ctx = {
  locale: { bind: () => (key) => key, register() {} },
  effect: (callback) => callback(),
  slots: { inject: (_, callback) => callback(), register: (_, component) => { Section = component } },
  remote: new Proxy({}, { get: () => assert.fail('history selection must not access remote APIs') }),
}
client.apply(ctx)
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object') return []
  return [node, ...elements(node.props?.children)]
}
const section = Section({ ctx, t: (key) => key })
const fields = elements(section).find((node) => node.type?.name === 'ModelFields')
const fieldsTree = fields.type(fields.props)
const historySelect = elements(fieldsTree).find((node) => node.type === 'select')
const options = elements(historySelect).filter((node) => node.type === 'option' && node.props.value)
assert.equal(options.length, 1)
assert.equal(options[0].props.children[0], 'model-a')
historySelect.props.onChange({ target: { value: 'model-a' } })
assert.equal(hookStates[4].id, 'model-a')
assert.equal(hookStates[4].name, 'Model A')
assert.equal(hookStates[4].contextWindow, 64_000)
assert.equal(hookStates[4].imageSupport, false)
assert.equal(Object.hasOwn(hookStates[4], 'template'), false)
assert.equal(hookStates[1], 'openai')

hookIndex = 0
hookStates[2] = 'new'
const newSection = Section({ ctx, t: (key) => key })
const newForm = elements(newSection).find((node) => node.type?.name === 'NewProviderForm')
const typedProvider = { ...providerDraft, apiKey: 'current-provider-key' }
hookStates.splice(0, hookStates.length, typedProvider, draftBeforeHistory, null, false, false, false, null)
hookIndex = 0
const newFormTree = newForm.type(newForm.props)
const newFields = elements(newFormTree).find((node) => node.type?.name === 'ModelFields')
const newHistorySelect = elements(newFields.type(newFields.props)).find((node) => node.type === 'select')
newHistorySelect.props.onChange({ target: { value: 'model-a' } })
assert.equal(hookStates[0], typedProvider)
assert.equal(hookStates[0].apiKey, 'current-provider-key')
assert.equal(hookStates[0].baseURL, providerDraft.baseURL)
assert.equal(hookStates[0].api, providerDraft.api)
assert.equal(hookStates[1].id, 'model-a')
assert.equal(hookStates[1].name, 'Model A')
assert.equal(hookStates[1].contextWindow, 64_000)
assert.equal(hookStates[1].imageSupport, false)

console.log('ok')
