const DEFAULT_EFFORTS = Object.freeze(['low', 'medium', 'high', 'xhigh', 'max'])
const DEFAULT_EFFORT = 'high'
const DEFAULT_CONTEXT_WINDOW = 1_000_000
const DEFAULT_INPUT_MODALITIES = Object.freeze(['text', 'image'])
const DEFAULT_FEATURES = Object.freeze({
  reasoningEffort: true,
  contextWindow: true,
  imageInput: true,
})
const INSTALLED = Symbol('dsh-default-reasoning-installed')

const title = (value) => value.charAt(0).toUpperCase() + value.slice(1)

export function reasoningMetadata(efforts = DEFAULT_EFFORTS, defaultEffort = DEFAULT_EFFORT) {
  const ids = [...new Set(efforts)].filter((id) => typeof id === 'string' && id.length > 0)
  const selected = ids.includes(defaultEffort) ? defaultEffort : ids[0]
  if (ids.length === 0 || selected === undefined) return undefined
  return {
    efforts: ids.map((id) => ({ id, name: title(id) })),
    defaultEffort: selected,
  }
}

export function resolveFeatures(config = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_FEATURES).map(([feature, enabled]) => {
    const value = config[feature]
    if (value !== undefined && typeof value !== 'boolean') {
      throw new TypeError(`Plugin config ${feature} must be a boolean`)
    }
    return [feature, value ?? enabled]
  }))
}

export function fillModelInfo(info, efforts = DEFAULT_EFFORTS, defaultEffort = DEFAULT_EFFORT, features = DEFAULT_FEATURES) {
  if (!info) return info

  const hasInputModalities = Array.isArray(info.inputModalities) && info.inputModalities.length > 0
  const hasContextWindow = info.context?.contextWindow !== undefined
  const needsImageInput = features.imageInput && !hasInputModalities
  const needsContextWindow = features.contextWindow && !hasContextWindow
  const withCapabilities = !needsImageInput && !needsContextWindow
    ? info
    : {
        ...info,
        ...(needsContextWindow ? { context: { ...info.context, contextWindow: DEFAULT_CONTEXT_WINDOW } } : {}),
        ...(needsImageInput ? { inputModalities: [...DEFAULT_INPUT_MODALITIES] } : {}),
      }

  if (!features.reasoningEffort) return withCapabilities

  const existing = info.reasoning
  if (existing !== undefined) {
    const existingEfforts = Array.isArray(existing?.efforts) ? existing.efforts : undefined
    const hasSelectableEffort = existingEfforts?.some((item) => item?.id && item.id !== 'off')
    if (existingEfforts === undefined) return withCapabilities
    if (hasSelectableEffort) {
      if (existing.defaultEffort !== undefined) return withCapabilities
      const selectedEffort = existingEfforts.find((item) => item?.id === DEFAULT_EFFORT)?.id
        ?? existingEfforts.find((item) => typeof item?.id === 'string' && item.id !== 'off')?.id
      return selectedEffort === undefined
        ? withCapabilities
        : { ...withCapabilities, reasoning: { ...existing, defaultEffort: selectedEffort } }
    }
  }

  const reasoning = reasoningMetadata(efforts, defaultEffort)
  return reasoning === undefined ? withCapabilities : { ...withCapabilities, reasoning }
}

function fillPiModel(model, efforts, defaultEffort, features) {
  if (!model) return model
  const withCapabilities = {
    ...model,
    ...(features.contextWindow && model.contextWindow == null ? { contextWindow: DEFAULT_CONTEXT_WINDOW } : {}),
    ...(features.imageInput && (!Array.isArray(model.input) || model.input.length === 0)
      ? { input: [...DEFAULT_INPUT_MODALITIES] }
      : {}),
  }
  if (!features.reasoningEffort || model.reasoning === true) return withCapabilities

  const ids = reasoningMetadata(efforts, defaultEffort)?.efforts.map((item) => item.id)
  if (!ids?.length) return withCapabilities
  const map = Object.fromEntries([
    ['off', null],
    ['minimal', null],
    ['low', null],
    ['medium', null],
    ['high', null],
    ['xhigh', null],
    ['max', null],
  ])
  for (const id of ids) map[id] = id
  return {
    ...withCapabilities,
    reasoning: true,
    thinkingLevelMap: map,
  }
}

function installOnAdapter(adapter, efforts, defaultEffort, features, restorers) {
  if (!adapter || adapter[INSTALLED]) return
  const originalModelOf = typeof adapter.modelOf === 'function' ? adapter.modelOf : undefined
  const originalResolveModel = typeof adapter.resolveModel === 'function' ? adapter.resolveModel : undefined
  const originalPrepareCall = typeof adapter.prepareCall === 'function' ? adapter.prepareCall : undefined

  if (originalModelOf) {
    adapter.modelOf = function (...args) {
      return fillPiModel(originalModelOf.apply(this, args), efforts, defaultEffort, features)
    }
  }
  if (originalResolveModel) {
    adapter.resolveModel = async function (...args) {
      return fillModelInfo(await originalResolveModel.apply(this, args), efforts, defaultEffort, features)
    }
  }
  if (originalPrepareCall) {
    adapter.prepareCall = async function (...args) {
      const call = await originalPrepareCall.apply(this, args)
      if (!call?.model) return call
      return { ...call, model: fillModelInfo(call.model, efforts, defaultEffort, features) }
    }
  }

  // WorkBuddy's adapter uses this predicate to normalize models without catalog
  // reasoning data to `off`; marking the missing-data case as capable lets the
  // model descriptor above reach the normal effort path.
  if (features.reasoningEffort && typeof adapter.effortCapable === 'function') {
    const originalEffortCapable = adapter.effortCapable
    adapter.effortCapable = () => true
    restorers.push(() => { adapter.effortCapable = originalEffortCapable })
  }

  Object.defineProperty(adapter, INSTALLED, { value: true, configurable: true })
  restorers.push(() => {
    if (originalModelOf) adapter.modelOf = originalModelOf
    if (originalResolveModel) adapter.resolveModel = originalResolveModel
    if (originalPrepareCall) adapter.prepareCall = originalPrepareCall
    delete adapter[INSTALLED]
  })
}

function install(llm, eventContext, efforts, defaultEffort, features) {
  const restorers = []
  const sweep = () => {
    const adapters = llm?.adapters
    if (!(adapters instanceof Map)) return
    for (const registration of adapters.values()) {
      installOnAdapter(registration?.adapter, efforts, defaultEffort, features, restorers)
    }
  }
  sweep()
  const onUpdated = typeof eventContext?.on === 'function'
    ? eventContext.on('llm/adapters-updated', sweep)
    : undefined
  return () => {
    if (typeof onUpdated === 'function') onUpdated()
    else onUpdated?.dispose?.()
    for (const restore of restorers.splice(0)) restore()
  }
}

export const name = 'dsh-default-reasoning'
export const inject = ['llm']

export function apply(ctx, config = {}) {
  const efforts = config.efforts ?? DEFAULT_EFFORTS
  const defaultEffort = config.defaultEffort ?? DEFAULT_EFFORT
  const features = resolveFeatures(config)
  ctx.inject(['llm'], (llmCtx) => {
    const dispose = install(llmCtx.llm, llmCtx, efforts, defaultEffort, features)
    llmCtx.effect(() => dispose)
  })
}

export { DEFAULT_EFFORT, DEFAULT_EFFORTS }
