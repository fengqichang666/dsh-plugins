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

export function configuredModelProviders(directory, settingsView) {
  if (!Array.isArray(directory)) throw new TypeError('Provider directory must be an array')
  if (!Array.isArray(settingsView?.namespaces)) throw new TypeError('Settings namespaces are missing')
  if (typeof settingsView.writable !== 'boolean') throw new TypeError('Settings writability is missing')

  const entries = directory.filter((entry) => entry?.settingsNs === MODEL_SETTINGS_NAMESPACE)
  const namespace = settingsView.namespaces.find((item) => item.ns === MODEL_SETTINGS_NAMESPACE)
  if (entries.length > 0 && !namespace) throw new Error(`Settings namespace ${MODEL_SETTINGS_NAMESPACE} is unavailable`)
  if (entries.length === 0) return { writable: settingsView.writable, providers: [] }
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

  return { writable: settingsView.writable, providers }
}

export function historyModels(providers) {
  return providers.flatMap((provider) => provider.models.flatMap((model, index) => {
    if (typeof model?.id !== 'string' || model.id.length === 0) return []
    return [{
      key: JSON.stringify([provider.provider, index]),
      provider: provider.provider,
      displayName: provider.displayName,
      model,
    }]
  }))
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

export function buildModelEntry({ id, name, contextWindow, imageSupport, template }) {
  const model = template === undefined ? {} : structuredClone(template)
  if (model.input !== undefined && !Array.isArray(model.input)) throw new TypeError('Model input modalities must be an array')
  const input = model.input === undefined ? ['text'] : [...model.input]
  if (!input.includes('text')) input.unshift('text')
  const modalities = imageSupport
    ? input.includes('image') ? input : [...input, 'image']
    : input.filter((modality) => modality !== 'image')

  return { ...model, id, name, contextWindow, input: modalities }
}
