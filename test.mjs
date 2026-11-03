import assert from 'node:assert/strict'
import { apply, fillModelInfo, reasoningMetadata } from './index.js'

const info = fillModelInfo({ provider: 'p', id: 'm', name: 'm' })
assert.deepEqual(info.reasoning.efforts.map(({ id }) => id), ['low', 'medium', 'high', 'xhigh', 'max'])
assert.equal(info.reasoning.defaultEffort, 'high')
const existing = { provider: 'p', id: 'm', name: 'm', reasoning: { efforts: [{ id: 'off', name: 'Off' }] } }
assert.deepEqual(fillModelInfo(existing).reasoning.efforts.map(({ id }) => id), ['low', 'medium', 'high', 'xhigh', 'max'])
assert.equal(reasoningMetadata(['low'], 'high').defaultEffort, 'low')

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
assert.equal(adapter.modelOf().thinkingLevelMap.high, 'high')
assert.equal((await adapter.resolveModel()).reasoning.defaultEffort, 'high')
cleanup?.()
console.log('ok')
