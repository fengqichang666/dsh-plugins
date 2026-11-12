export const MODEL_SETTINGS_NAMESPACE = 'llm-pi-ai'
export const DEFAULT_CONTEXT_WINDOW = 1_000_000

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getAtPath(value, path) {
  return path.reduce((current, key) => {
    if (!isRecord(current)) return undefined
    return current[key]
  }, value)
}

export function configuredModelProviders(directory, settingsView, registered = []) {
  if (!Array.isArray(directory)) throw new TypeError('Provider directory must be an array')
  if (!Array.isArray(settingsView?.namespaces)) throw new TypeError('Settings namespaces are missing')
  if (typeof settingsView.writable !== 'boolean') throw new TypeError('Settings writability is missing')

  const entries = directory.filter((entry) => entry?.settingsNs === MODEL_SETTINGS_NAMESPACE)
  const namespace = settingsView.namespaces.find((item) => item.ns === MODEL_SETTINGS_NAMESPACE)
  if (!namespace) throw new Error(`Settings namespace ${MODEL_SETTINGS_NAMESPACE} is unavailable`)
  if (!isRecord(namespace.value)) throw new TypeError(`Settings namespace ${MODEL_SETTINGS_NAMESPACE} has no value`)
  if (namespace.revision === undefined) throw new TypeError(`Settings namespace ${MODEL_SETTINGS_NAMESPACE} has no revision`)

  const providers = []
  for (const entry of entries) {
    if (typeof entry.provider !== 'string' || typeof entry.displayName !== 'string' || !Array.isArray(entry.settingsPath) || entry.settingsPath.length === 0) {
      throw new TypeError('Configurable provider metadata is incomplete')
    }
    const config = getAtPath(namespace.value, entry.settingsPath)
    if (config === undefined) continue
    if (!isRecord(config)) throw new TypeError(`Provider ${entry.provider} settings are invalid`)
    if (config.models !== undefined && !Array.isArray(config.models)) throw new TypeError(`Provider ${entry.provider} models are invalid`)

    providers.push({
      provider: entry.provider,
      displayName: entry.displayName,
      settingsPath: [...entry.settingsPath],
      revision: namespace.revision,
      models: config.models ?? [],
    })
  }

  return {
    writable: settingsView.writable,
    providers,
    revision: namespace.revision,
    taken: [...new Set([
      ...directory.map((entry) => entry.provider),
      ...registered.map((provider) => provider.id),
      ...Object.keys(namespace.value.providers ?? {}),
    ])],
  }
}

export function historyModels(providers) {
  const models = new Map()
  for (const provider of providers) {
    for (const model of provider.models) {
      if (typeof model?.id !== 'string' || model.id.length === 0 || models.has(model.id)) continue
      models.set(model.id, { id: model.id, name: typeof model.name === 'string' ? model.name : '' })
    }
  }
  return [...models.values()]
}

export function fillModelFromHistory(draft, choice) {
  // 历史记录只是名称快捷填充，不导入原提供商的模型参数或连接信息。
  return { ...draft, id: choice.id, name: choice.name }
}

export function validateModelDraft(draft, models) {
  const id = draft.id.trim()
  const name = draft.name.trim()
  const contextWindow = Number(draft.contextWindow)
  if (!id) return { error: 'idRequired' }
  if (!name) return { error: 'nameRequired' }
  if (!Number.isSafeInteger(contextWindow) || contextWindow <= 0) return { error: 'contextWindowInvalid' }
  if (models.some((model) => model?.id === id)) return { error: 'duplicateModel' }
  return { value: { id, name, contextWindow } }
}

export function modelSettingsPath(provider) {
  return [...provider.settingsPath, 'models']
}

export function buildModelEntry({ id, name, contextWindow, imageSupport }) {
  return { id, name, contextWindow, input: imageSupport ? ['text', 'image'] : ['text'] }
}
