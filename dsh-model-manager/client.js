import * as React from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  buildModelEntry,
  configuredModelProviders,
  DEFAULT_CONTEXT_WINDOW,
  historyModels,
  MODEL_SETTINGS_NAMESPACE,
  modelSettingsPath,
  validateModelDraft,
} from './model-data.js'

const NS = 'dsh-model-manager'
const inject = ['slots', 'locale', 'remote', 'remote.llm', 'remote.settings']
const messages = {
  zh: {
    nav: '模型管理',
    title: '添加模型',
    intro: '添加后会写入 DSH 原生 Models 配置，并同步到模型选择器。',
    loading: '正在读取模型配置…',
    retry: '重试',
    provider: '提供商',
    chooseProvider: '选择提供商',
    history: '历史模型',
    chooseHistory: '选择已保存的模型以回填',
    modelId: '模型 ID',
    modelName: '模型名称',
    contextWindow: '上下文窗口（tokens）',
    imageSupport: '支持图片输入',
    add: '添加模型',
    confirmTitle: '确认添加模型',
    confirmDescription: '确认后会将模型写入所选提供商的原生 Models 配置。',
    close: '关闭',
    cancel: '取消',
    confirm: '确认并同步',
    saving: '正在保存…',
    saved: '模型已同步到原生 Models。',
    readOnly: '当前设置为只读，无法保存模型。',
    noProviders: '没有可管理的 pi-ai 提供商。请先在原生 Models 中添加提供商。',
    loadFailed: '读取模型配置失败：',
    saveFailed: '保存失败：',
    conflict: '配置已被其他页面修改，请刷新后重试。',
    idRequired: '请输入模型 ID。',
    nameRequired: '请输入模型名称。',
    contextWindowInvalid: '上下文窗口必须是大于 0 的整数。',
    duplicateModel: '该提供商中已存在此模型 ID。',
  },
  en: {
    nav: 'Model Manager',
    title: 'Add a model',
    intro: 'Models are written to DSH native Models settings and appear in the model picker.',
    loading: 'Loading model settings…',
    retry: 'Retry',
    provider: 'Provider',
    chooseProvider: 'Choose a provider',
    history: 'Saved models',
    chooseHistory: 'Choose a saved model to fill the form',
    modelId: 'Model ID',
    modelName: 'Model name',
    contextWindow: 'Context window (tokens)',
    imageSupport: 'Accept image input',
    add: 'Add model',
    confirmTitle: 'Confirm model addition',
    confirmDescription: 'This writes the model to the selected provider in native Models settings.',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm and sync',
    saving: 'Saving…',
    saved: 'Model synced to native Models.',
    readOnly: 'Settings are read-only; models cannot be saved.',
    noProviders: 'No configurable pi-ai providers are available. Add a provider in native Models first.',
    loadFailed: 'Could not read model settings: ',
    saveFailed: 'Could not save model: ',
    conflict: 'Settings changed elsewhere. Refresh and try again.',
    idRequired: 'Enter a model ID.',
    nameRequired: 'Enter a model name.',
    contextWindowInvalid: 'Context window must be a positive integer.',
    duplicateModel: 'This provider already has a model with this ID.',
  },
}

const emptyDraft = () => ({ id: '', name: '', contextWindow: DEFAULT_CONTEXT_WINDOW, imageSupport: true })
const controlStyle = {
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
  height: 34,
  border: '1px solid var(--dsw-alias-border-l3)',
  borderRadius: 'var(--dsw-radius-md)',
  background: 'var(--dsw-alias-bg-layer-1)',
  color: 'var(--dsw-alias-label-primary)',
  font: 'inherit',
  padding: '0 10px',
}

function Field(label, control) {
  return React.createElement('label', {
    style: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 },
  }, React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, label), control)
}

function ModelManagerSection({ ctx, t }) {
  const [snapshot, setSnapshot] = React.useState({ loading: true, error: null, writable: false, providers: [] })
  const [providerId, setProviderId] = React.useState('')
  const [historyKey, setHistoryKey] = React.useState('')
  const [draft, setDraft] = React.useState(emptyDraft)
  const [notice, setNotice] = React.useState(null)
  const [confirmation, setConfirmation] = React.useState(null)
  const [saving, setSaving] = React.useState(false)
  const savingRef = React.useRef(false)
  const loadGeneration = React.useRef(0)
  const selectedProvider = snapshot.providers.find((provider) => provider.provider === providerId)
  const history = historyModels(snapshot.providers)

  const reload = React.useCallback(async () => {
    const generation = ++loadGeneration.current
    setSnapshot((current) => ({ ...current, loading: true, error: null }))
    try {
      const [directory, settings] = await Promise.all([
        ctx.remote.llm.listConfigurableProviders(),
        ctx.remote.settings.describe(),
      ])
      if (!directory.ok) throw new Error(directory.error.message)
      if (!settings.ok) throw new Error(settings.error.message)
      const result = configuredModelProviders(directory.value, settings.value)
      if (generation !== loadGeneration.current) return
      setSnapshot({ loading: false, error: null, ...result })
      setProviderId((current) => result.providers.some((provider) => provider.provider === current)
        ? current
        : result.providers[0]?.provider ?? '')
    } catch (error) {
      if (generation !== loadGeneration.current) return
      setSnapshot((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }))
    }
  }, [ctx])

  React.useEffect(() => {
    void reload()
    const refresh = () => { void reload() }
    const disposers = [
      ctx.remote.$on('settings/document-updated', refresh),
      ctx.remote.$on('llm/adapters-updated', refresh),
      ctx.on('connection/reset', refresh),
    ]
    return () => {
      loadGeneration.current += 1
      for (const dispose of disposers) dispose()
    }
  }, [ctx, reload])

  const applyHistory = (key) => {
    setHistoryKey(key)
    const choice = history.find((item) => item.key === key)
    if (!choice) return
    setDraft({
      id: choice.model.id,
      name: typeof choice.model.name === 'string' ? choice.model.name : '',
      contextWindow: choice.model.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
      imageSupport: Array.isArray(choice.model.input) ? choice.model.input.includes('image') : true,
      template: choice.model,
    })
    setNotice(null)
  }

  const requestSave = () => {
    if (savingRef.current || !selectedProvider || snapshot.loading || snapshot.error) return
    if (!snapshot.writable) {
      setNotice({ type: 'error', message: t('readOnly') })
      return
    }
    const validation = validateModelDraft(draft, selectedProvider.models)
    if (validation.error) {
      setNotice({ type: 'error', message: t(validation.error) })
      return
    }
    try {
      const model = buildModelEntry({ ...validation.value, imageSupport: draft.imageSupport, template: draft.template })
      setConfirmation({ provider: selectedProvider, model })
      setNotice(null)
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  const confirmSave = async () => {
    if (savingRef.current || !confirmation) return
    savingRef.current = true
    setSaving(true)
    try {
      const { provider, model } = confirmation
      const response = await ctx.remote.settings.mutate(
        MODEL_SETTINGS_NAMESPACE,
        [{ op: 'set', path: modelSettingsPath(provider), value: [...provider.models, model] }],
        provider.revision,
      )
      if (!response.ok) {
        if (response.error.code === 'settings/conflict') {
          setNotice({ type: 'error', message: t('conflict') })
          await reload()
        } else {
          setNotice({ type: 'error', message: `${t('saveFailed')}${response.error.message}` })
        }
        return
      }
      setConfirmation(null)
      setDraft(emptyDraft())
      setHistoryKey('')
      setNotice({ type: 'success', message: t('saved') })
      await reload()
    } catch (error) {
      setNotice({ type: 'error', message: `${t('saveFailed')}${error instanceof Error ? error.message : String(error)}` })
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const disabled = saving || snapshot.loading || Boolean(snapshot.error) || !snapshot.writable || !selectedProvider
  const providerSelect = React.createElement('select', {
    value: providerId,
    disabled: snapshot.loading || snapshot.providers.length === 0 || saving,
    onChange: (event) => {
      setProviderId(event.target.value)
      setDraft(emptyDraft())
      setHistoryKey('')
      setNotice(null)
    },
    style: controlStyle,
  }, React.createElement('option', { value: '' }, t('chooseProvider')),
  ...snapshot.providers.map((provider) => React.createElement('option', {
    key: provider.provider,
    value: provider.provider,
  }, `${provider.displayName} (${provider.provider})`)))

  const historySelect = React.createElement('select', {
    value: historyKey,
    disabled: history.length === 0 || saving,
    onChange: (event) => applyHistory(event.target.value),
    style: controlStyle,
  }, React.createElement('option', { value: '' }, t('chooseHistory')),
  ...history.map((item) => React.createElement('option', {
    key: item.key,
    value: item.key,
  }, `${item.model.id}${item.model.name ? ` — ${item.model.name}` : ''} · ${item.displayName}`)))

  return React.createElement(React.Fragment, null,
    React.createElement('section', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 720,
        color: 'var(--dsw-alias-label-primary)',
      },
    },
    React.createElement('h2', { style: { margin: 0, fontSize: 16, fontWeight: 500 } }, t('title')),
    React.createElement('p', { style: { margin: 0, color: 'var(--dsw-alias-label-tertiary)', fontSize: 13 } }, t('intro')),
    snapshot.loading && React.createElement('p', { role: 'status', style: { margin: 0 } }, t('loading')),
    snapshot.error && React.createElement('p', { role: 'alert', style: { margin: 0, color: 'var(--dsw-alias-state-error-primary)' } }, `${t('loadFailed')}${snapshot.error}`),
    snapshot.error && React.createElement(Button, { variant: 'outline', disabled: snapshot.loading, onClick: () => { void reload() } }, t('retry')),
    !snapshot.loading && !snapshot.error && snapshot.providers.length === 0 && React.createElement('p', { role: 'status', style: { margin: 0 } }, t('noProviders')),
    !snapshot.writable && !snapshot.loading && !snapshot.error && React.createElement('p', { role: 'status', style: { margin: 0 } }, t('readOnly')),
    Field(t('provider'), providerSelect),
    Field(t('history'), historySelect),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 } },
      Field(t('modelId'), React.createElement('input', {
        type: 'text', value: draft.id, autoComplete: 'off', disabled: disabled,
        onChange: (event) => setDraft((current) => ({ ...current, id: event.target.value })),
        style: controlStyle,
      })),
      Field(t('modelName'), React.createElement('input', {
        type: 'text', value: draft.name, autoComplete: 'off', disabled: disabled,
        onChange: (event) => setDraft((current) => ({ ...current, name: event.target.value })),
        style: controlStyle,
      }))),
    Field(t('contextWindow'), React.createElement('input', {
      type: 'number', min: 1, step: 1, value: draft.contextWindow, disabled: disabled,
      onChange: (event) => setDraft((current) => ({ ...current, contextWindow: event.target.value })),
      style: controlStyle,
    })),
    React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 } },
      React.createElement('input', {
        type: 'checkbox', checked: draft.imageSupport, disabled: disabled,
        onChange: (event) => setDraft((current) => ({ ...current, imageSupport: event.target.checked })),
      }),
      t('imageSupport')),
    notice && React.createElement('p', {
      role: notice.type === 'error' ? 'alert' : 'status',
      style: { margin: 0, color: notice.type === 'error' ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-success-primary)' },
    }, notice.message),
    React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
      React.createElement(Button, { variant: 'outline', disabled, onClick: requestSave }, t('add')))),
    React.createElement(Modal, {
      open: confirmation !== null,
      onClose: () => { if (!savingRef.current) setConfirmation(null) },
      title: t('confirmTitle'),
      closeLabel: t('close'),
      description: confirmation
        ? `${t('confirmDescription')} ${confirmation.provider.displayName}: ${confirmation.model.id} (${confirmation.model.name})`
        : '',
      footer: React.createElement(React.Fragment, null,
        React.createElement(Button, {
          variant: 'outline',
          'data-modal-autofocus': true,
          disabled: saving,
          onClick: () => setConfirmation(null),
        }, t('cancel')),
        React.createElement(Button, {
          variant: 'outline',
          disabled: saving,
          onClick: confirmSave,
        }, saving ? t('saving') : t('confirm'))),
    }))
}

export { apply, inject }

function apply(ctx) {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, messages), 'dsh-model-manager: locale')
  const injected = () => ({ ctx, t })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'model-manager',
    order: 20,
    label: () => t('nav'),
    locale: NS,
    inject: injected,
  }, ModelManagerSection))
}
