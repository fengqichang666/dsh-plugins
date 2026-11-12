import assert from 'node:assert/strict'
import { apply, fillModelInfo, reasoningMetadata, resolveFeatures } from './index.js'

const info = fillModelInfo({ provider: 'p', id: 'm', name: 'm' })
assert.deepEqual(info.reasoning.efforts.map(({ id }) => id), ['low', 'medium', 'high', 'xhigh', 'max'])
assert.equal(info.reasoning.defaultEffort, 'high')
assert.equal(info.context.contextWindow, 1_000_000)
assert.deepEqual(info.inputModalities, ['text', 'image'])
const existing = { provider: 'p', id: 'm', name: 'm', reasoning: { efforts: [{ id: 'off', name: 'Off' }] } }
assert.deepEqual(fillModelInfo(existing).reasoning.efforts.map(({ id }) => id), ['low', 'medium', 'high', 'xhigh', 'max'])
assert.equal(reasoningMetadata(['low'], 'high').defaultEffort, 'low')
assert.deepEqual(resolveFeatures({ imageInput: false }), {
  reasoningEffort: true,
  contextWindow: true,
  imageInput: false,
})
assert.throws(() => resolveFeatures({ contextWindow: 'false' }), /must be a boolean/)
const missingDefault = fillModelInfo({
  provider: 'p',
  id: 'm',
  name: 'm',
  reasoning: { efforts: [{ id: 'low' }, { id: 'high' }] },
})
assert.equal(missingDefault.reasoning.defaultEffort, 'high')
const configured = fillModelInfo({
  provider: 'p',
  id: 'm',
  name: 'm',
  context: { contextWindow: 128_000 },
  inputModalities: ['text'],
})
assert.equal(configured.context.contextWindow, 128_000)
assert.deepEqual(configured.inputModalities, ['text'])
const disabled = fillModelInfo({ provider: 'p', id: 'm', name: 'm' }, undefined, undefined, {
  reasoningEffort: false,
  contextWindow: false,
  imageInput: false,
})
assert.equal(disabled.reasoning, undefined)
assert.equal(disabled.context, undefined)
assert.equal(disabled.inputModalities, undefined)
const contextOnly = fillModelInfo({ provider: 'p', id: 'm', name: 'm' }, undefined, undefined, {
  reasoningEffort: false,
  contextWindow: true,
  imageInput: false,
})
assert.equal(contextOnly.context.contextWindow, 1_000_000)
assert.equal(contextOnly.inputModalities, undefined)

const adapter = {
  modelOf: () => ({ id: 'm', reasoning: false }),
  resolveModel: async () => ({ provider: 'p', id: 'm', name: 'm' }),
  prepareCall: async () => ({ model: { provider: 'p', id: 'm', name: 'm' } }),
}
let cleanup
const serviceContext = {
  llm: { adapters: new Map([['p', { adapter }]]) },
  on: () => () => {},
  effect: (factory) => { cleanup = factory() },
}
apply({ inject: (_deps, callback) => callback(serviceContext) }, {})
const piModel = adapter.modelOf()
assert.equal(piModel.thinkingLevelMap.high, 'high')
assert.equal(piModel.contextWindow, 1_000_000)
assert.deepEqual(piModel.input, ['text', 'image'])
assert.equal((await adapter.resolveModel()).reasoning.defaultEffort, 'high')
cleanup?.()

const configuredAdapter = {
  modelOf: () => ({ id: 'm', reasoning: false, contextWindow: 128_000, input: ['text'] }),
}
let configuredCleanup
const configuredContext = {
  llm: { adapters: new Map([['p', { adapter: configuredAdapter }]]) },
  on: () => () => {},
  effect: (factory) => { configuredCleanup = factory() },
}
apply({ inject: (_deps, callback) => callback(configuredContext) }, {})
const configuredPiModel = configuredAdapter.modelOf()
assert.equal(configuredPiModel.contextWindow, 128_000)
assert.deepEqual(configuredPiModel.input, ['text'])
configuredCleanup?.()

const disabledAdapter = {
  modelOf: () => ({ id: 'm', reasoning: false }),
  effortCapable: () => false,
}
let disabledCleanup
const disabledContext = {
  llm: { adapters: new Map([['p', { adapter: disabledAdapter }]]) },
  on: () => () => {},
  effect: (factory) => { disabledCleanup = factory() },
}
apply({ inject: (_deps, callback) => callback(disabledContext) }, {
  reasoningEffort: false,
  contextWindow: false,
  imageInput: false,
})
assert.deepEqual(disabledAdapter.modelOf(), { id: 'm', reasoning: false })
assert.equal(disabledAdapter.effortCapable(), false)
disabledCleanup?.()
console.log('ok')
