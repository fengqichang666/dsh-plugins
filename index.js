const DEFAULT_EFFORTS = Object.freeze(['low', 'medium', 'high', 'xhigh', 'max'])
const DEFAULT_EFFORT = 'high'
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

export function fillModelInfo(info, efforts = DEFAULT_EFFORTS, defaultEffort = DEFAULT_EFFORT) {
  if (!info) return info
  const existing = info.reasoning
  if (existing !== undefined) {
    const existingEfforts = Array.isArray(existing?.efforts) ? existing.efforts : undefined
    const hasSelectableEffort = existingEfforts?.some((item) => item?.id && item.id !== 'off')
    if (existingEfforts === undefined || hasSelectableEffort) return info
  }
  const reasoning = reasoningMetadata(efforts, defaultEffort)
  return reasoning === undefined ? info : { ...info, reasoning }
}

function fillPiModel(model, efforts, defaultEffort) {
  if (!model || model.reasoning === true) return model
  const ids = reasoningMetadata(efforts, defaultEffort)?.efforts.map((item) => item.id)
  if (!ids?.length) return model
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
    ...model,
    reasoning: true,
    thinkingLevelMap: map,
  }
}

function installOnAdapter(adapter, efforts, defaultEffort, restorers) {
  if (!adapter || adapter[INSTALLED]) return
  const originalModelOf = typeof adapter.modelOf === 'function' ? adapter.modelOf : undefined
  const originalResolveModel = typeof adapter.resolveModel === 'function' ? adapter.resolveModel : undefined
  const originalPrepareCall = typeof adapter.prepareCall === 'function' ? adapter.prepareCall : undefined

  if (originalModelOf) {
    adapter.modelOf = function (...args) {
      return fillPiModel(originalModelOf.apply(this, args), efforts, defaultEffort)
    }
  }
  if (originalResolveModel) {
    adapter.resolveModel = async function (...args) {
      return fillModelInfo(await originalResolveModel.apply(this, args), efforts, defaultEffort)
    }
  }
  if (originalPrepareCall) {
    adapter.prepareCall = async function (...args) {
      const call = await originalPrepareCall.apply(this, args)
      if (!call?.model) return call
      return { ...call, model: fillModelInfo(call.model, efforts, defaultEffort) }
    }
  }

  // WorkBuddy's adapter uses this predicate to normalize models without catalog
  // reasoning data to `off`; marking the missing-data case as capable lets the
  // model descriptor above reach the normal effort path.
  if (typeof adapter.effortCapable === 'function') {
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

function install(llm, eventContext, efforts, defaultEffort) {
  const restorers = []
  const sweep = () => {
    const adapters = llm?.adapters
    if (!(adapters instanceof Map)) return
    for (const registration of adapters.values()) {
      installOnAdapter(registration?.adapter, efforts, defaultEffort, restorers)
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
  ctx.inject(['llm'], (llmCtx) => {
    const dispose = install(llmCtx.llm, llmCtx, efforts, defaultEffort)
    llmCtx.effect(() => dispose)
  })
}

export { DEFAULT_EFFORT, DEFAULT_EFFORTS }
