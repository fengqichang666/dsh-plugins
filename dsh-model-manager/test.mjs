import assert from 'node:assert/strict'
import {
  buildModelEntry,
  configuredModelProviders,
  DEFAULT_CONTEXT_WINDOW,
  historyModels,
  modelSettingsPath,
  validateModelDraft,
} from './model-data.js'

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
assert.equal(historyModels(providers)[0].model, model)
assert.deepEqual(buildModelEntry({
  id: 'new-model', name: 'New Model', contextWindow: DEFAULT_CONTEXT_WINDOW, imageSupport: true,
}), {
  id: 'new-model', name: 'New Model', contextWindow: 1_000_000, input: ['text', 'image'],
})
assert.deepEqual(buildModelEntry({
  id: 'copied', name: 'Copied', contextWindow: 128_000, imageSupport: true, template: model,
}), { ...model, id: 'copied', name: 'Copied', input: ['text', 'image'] })
assert.deepEqual(validateModelDraft({ id: ' next ', name: ' Next ', contextWindow: '1000000' }, []), {
  value: { id: 'next', name: 'Next', contextWindow: 1_000_000 },
})
assert.equal(validateModelDraft({ id: 'model-a', name: 'Duplicate', contextWindow: 1000 }, [model]).error, 'duplicateModel')
assert.equal(validateModelDraft({ id: 'bad', name: 'Bad', contextWindow: '1.5' }, []).error, 'contextWindowInvalid')
assert.throws(() => buildModelEntry({
  id: 'bad-input', name: 'Bad Input', contextWindow: 1000, imageSupport: true, template: { input: 'text' },
}), /modalities/)
assert.throws(() => configuredModelProviders([], { namespaces: [], writable: 'yes' }), /writability/)

console.log('ok')
