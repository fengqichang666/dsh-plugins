import * as React from 'react'
import {
  Button,
  IconPlusOutlineRegular,
  IconTrashOutlineRegular,
  Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  configuredModelProviders,
  DEFAULT_CONTEXT_WINDOW,
  fillModelFromHistory,
  historyModels,
  MODEL_SETTINGS_NAMESPACE,
  modelSettingsPath,
  validateModelDrafts,
} from './model-data.js'
import { PROTOCOLS, saveNewProvider, validateApiKey, validateProviderDraft } from './provider-data.js'

const NS = 'dsh-model-manager'
const inject = ['slots', 'locale', 'remote', 'remote.llm', 'remote.settings', 'remote.credentials']
const messages = {
  zh: {
    nav: '模型管理',
    title: '提供商与模型管理',
    mode: '添加方式',
    newProvider: '新建提供商及模型',
    existingProvider: '向已有提供商添加模型',
    route: '提供商 ID（小写字母、数字、连字符）',
    displayName: '提供商名称（选填）',
    baseURL: '服务端地址（Base URL）',
    api: '接口格式',
    apiKey: 'API Key（无鉴权服务可留空）',
    keyHelp: '只填写密钥本身。密钥通过 DSH 凭据接口保存；更改已有提供商连接参数请使用原生 Models。',
    baseURLHelp: '填写服务商提供的 API 基础地址。OpenAI 兼容地址通常包含 /v1；Anthropic 通常不含 /v1/messages。',
    create: '创建提供商并添加模型',
    addModel: '添加另一个模型',
    removeModel: '移除这个模型',
    createConfirm: '确认创建提供商及模型',
    createDescription: '将创建下列提供商并同步模型到原生 Models；非空 API Key 将单独保存到 DSH 凭据。',
    created: '提供商及模型已同步到原生 Models。',
    keyPending: '提供商和模型已保存，但 API Key 保存失败。请检查或重新填写密钥后重试；不会重复创建提供商。',
    retryKey: '重试保存 API Key',
    routeInvalid: '提供商 ID 必须以小写字母开头，仅包含小写字母、数字和单个连字符，例如 my-provider。',
    routeTaken: '该提供商 ID 已被占用，请使用新的 ID。',
    protocolInvalid: '请选择支持的接口格式。',
    baseURLInvalid: '请输入有效的 HTTP/HTTPS 基础地址，不含账号密码、查询参数或片段。',
    keyInvalid: 'API Key 应为可见 ASCII 字符，不能包含空格、引号包装或 KEY= 赋值语句。',
    intro: '添加后会写入 DSH 原生 Models 配置，并同步到模型选择器。',
    loading: '正在读取模型配置…',
    retry: '重试',
    provider: '提供商',
    chooseProvider: '选择提供商',
    history: '历史模型',
    modelOptions: '模型参数',
    chooseHistory: '选择模型 ID，仅回填 ID 和名称',
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
    noProviders: '暂无已配置的提供商，请切换到“新建提供商及模型”。',
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
    title: 'Providers and models',
    mode: 'Add to',
    newProvider: 'New provider and model',
    existingProvider: 'Existing provider',
    route: 'Provider ID (lowercase letters, digits and hyphens)',
    displayName: 'Provider name (optional)',
    baseURL: 'Server address (Base URL)',
    api: 'API format',
    apiKey: 'API Key (optional for services without authentication)',
    keyHelp: 'Enter only the key. Keys use DSH credential storage. Edit existing connection settings in native Models.',
    baseURLHelp: 'Use the API base URL from your service. OpenAI URLs usually include /v1; Anthropic URLs usually omit /v1/messages.',
    create: 'Create provider and model',
    addModel: 'Add another model',
    removeModel: 'Remove this model',
    createConfirm: 'Confirm provider and model creation',
    createDescription: 'Create this provider and its models in native Models. A nonempty API Key is stored separately in DSH credentials.',
    created: 'Provider and model synced to native Models.',
    keyPending: 'Provider and model saved, but the API Key could not be stored. Check or replace the key and retry; the provider will not be created again.',
    retryKey: 'Retry saving API Key',
    routeInvalid: 'Use a lowercase letter followed by lowercase letters, digits or single hyphens, for example my-provider.',
    routeTaken: 'This provider ID is already taken. Choose another ID.',
    protocolInvalid: 'Choose a supported API format.',
    baseURLInvalid: 'Enter an HTTP/HTTPS base URL without credentials, query parameters or a fragment.',
    keyInvalid: 'Use visible ASCII characters without spaces, surrounding quotes or KEY= assignment syntax.',
    intro: 'Models are written to DSH native Models settings and appear in the model picker.',
    loading: 'Loading model settings…',
    retry: 'Retry',
    provider: 'Provider',
    chooseProvider: 'Choose a provider',
    history: 'Saved models',
    modelOptions: 'Model options',
    chooseHistory: 'Choose a model ID to fill only its ID and name',
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
    noProviders: 'No providers are configured yet. Switch to New provider and model.',
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
const iconButtonStyle = {
  boxSizing: 'border-box',
  width: 28,
  height: 28,
  padding: 0,
  border: '1px solid var(--dsw-alias-border-l3)',
  borderRadius: 'var(--dsw-radius-sm)',
  background: 'transparent',
  color: 'var(--dsw-alias-label-secondary)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

function Field(label, control, key) {
  return React.createElement('label', {
    key,
    style: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 },
  }, React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, label), control)
}

function ModelFields({ t, history, draft, setDraft, disabled, actions }) {
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr)) auto', alignItems: 'end', gap: 8 } },
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end', gap: 6 } },
    Field(t('modelId'), React.createElement('input', {
      type: 'text', value: draft.id, autoComplete: 'off', disabled, style: controlStyle,
      onChange: (event) => setDraft((current) => ({ ...current, id: event.target.value })),
    })),
    React.createElement('select', {
      value: '', disabled: disabled || history.length === 0,
      'aria-label': t('chooseHistory'), title: t('chooseHistory'),
      style: { ...controlStyle, width: 96 },
      onChange: (event) => {
        const choice = history.find((item) => item.id === event.target.value)
        if (!choice) return
        setDraft((current) => fillModelFromHistory(current, choice))
      },
    }, React.createElement('option', { value: '' }, t('history')),
    ...history.map((item) => React.createElement('option', { key: item.id, value: item.id }, item.id)))),
    Field(t('modelName'), React.createElement('input', {
      type: 'text', value: draft.name, autoComplete: 'off', disabled, style: controlStyle,
      onChange: (event) => setDraft((current) => ({ ...current, name: event.target.value })),
    })), actions),
    React.createElement('details', null,
    React.createElement('summary', { style: { cursor: 'pointer', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('modelOptions')),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 } },
    Field(t('contextWindow'), React.createElement('input', {
      type: 'number', min: 1, step: 1, value: draft.contextWindow, disabled, style: controlStyle,
      onChange: (event) => setDraft((current) => ({ ...current, contextWindow: event.target.value })),
    })),
    React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 } },
      React.createElement('input', {
        type: 'checkbox', checked: draft.imageSupport, disabled,
        onChange: (event) => setDraft((current) => ({ ...current, imageSupport: event.target.checked })),
      }), t('imageSupport')))))
}

function Notice({ notice }) {
  return notice && React.createElement('p', {
    role: notice.type === 'error' ? 'alert' : 'status',
    style: { margin: 0, color: notice.type === 'error' ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-success-primary)' },
  }, notice.message)
}

function ModelList({ t, history, models, setModels, disabled }) {
  return React.createElement(React.Fragment, null,
    ...models.map((draft, index) => React.createElement('div', {
      key: index,
      style: { display: 'flex', flexDirection: 'column', gap: 6 },
    },
    React.createElement(ModelFields, {
      t, history, draft,
      setDraft: (update) => {
        if (disabled) return
        setModels((current) => current.map((item, itemIndex) => itemIndex === index
          ? (typeof update === 'function' ? update(item) : update) : item))
      },
      disabled,
      actions: React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 4, height: 34 } },
        models.length > 1 && React.createElement('button', {
          type: 'button',
          'aria-label': `${t('removeModel')} ${index + 1}`,
          title: t('removeModel'),
          disabled,
          onClick: () => { if (!disabled) setModels((current) => current.filter((_, itemIndex) => itemIndex !== index)) },
          style: iconButtonStyle,
        }, React.createElement(IconTrashOutlineRegular, { size: 14 })),
        index === models.length - 1 && React.createElement('button', {
          type: 'button',
          'aria-label': t('addModel'),
          title: t('addModel'),
          disabled,
          onClick: () => { if (!disabled) setModels((current) => [...current, emptyDraft()]) },
          style: iconButtonStyle,
        }, React.createElement(IconPlusOutlineRegular, { size: 14 }))),
    }))))
}

function NewProviderForm({ ctx, t, snapshot, reload, onLockChange }) {
  const [provider, setProvider] = React.useState({ route: '', displayName: '', baseURL: '', api: 'openai-responses', apiKey: '' })
  const [models, setModels] = React.useState(() => [emptyDraft()])
  const [confirmation, setConfirmation] = React.useState(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [committed, setCommitted] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [notice, setNotice] = React.useState(null)
  const savingRef = React.useRef(false)
  const committedRef = React.useRef(false)
  const unavailable = snapshot.loading || Boolean(snapshot.error) || !snapshot.writable
  const disabled = unavailable || saving || committed

  const requestSave = () => {
    if (savingRef.current) return
    if (committedRef.current) {
      setModalOpen(true) // 部分成功时必须沿用原来的配置快照。
      return
    }
    if (unavailable) return
    const validated = validateProviderDraft(provider, snapshot.taken)
    if (validated.error) return setNotice({ type: 'error', message: t(validated.error) })
    const validatedModels = validateModelDrafts(models)
    if (validatedModels.error) return setNotice({ type: 'error', message: `#${validatedModels.index + 1}: ${t(validatedModels.error)}` })
    try {
      setConfirmation({
        ...validated.value,
        profile: {
          ...validated.value.profile,
          models: validatedModels.value,
        },
        revision: snapshot.revision,
      })
      setNotice(null)
      setModalOpen(true)
      onLockChange(true)
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  const confirmSave = async () => {
    if (savingRef.current || !confirmation) return
    const keyError = validateApiKey(provider.apiKey)
    if (keyError || (confirmation.profile.apiKeyEnv && !provider.apiKey.trim())) {
      setNotice({ type: 'error', message: t(keyError || 'keyInvalid') })
      return
    }
    savingRef.current = true
    setSaving(true)
    setNotice(null)
    try {
      const outcome = await saveNewProvider(ctx.remote, confirmation, provider.apiKey, committedRef.current, () => {
        committedRef.current = true
        setCommitted(true)
      })
      if (!outcome.ok) {
        if (outcome.stage === 'credentials') {
          setNotice({ type: 'error', message: t('keyPending') })
        } else if (outcome.error.code === 'settings/conflict') {
          setModalOpen(false)
          setConfirmation(null)
          onLockChange(false)
          setNotice({ type: 'error', message: t('conflict') })
          await reload()
        } else {
          setNotice({ type: 'error', message: `${t('saveFailed')}${outcome.error.message}` })
        }
        return
      }
      setConfirmation(null)
      setModalOpen(false)
      committedRef.current = false
      setCommitted(false)
      onLockChange(false)
      setProvider({ route: '', displayName: '', baseURL: '', api: 'openai-responses', apiKey: '' })
      setModels([emptyDraft()])
      setNotice({ type: 'success', message: t('created') })
      await reload()
    } catch (error) {
      setNotice({ type: 'error', message: `${t('saveFailed')}${error instanceof Error ? error.message : String(error)}` })
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const closeConfirmation = () => {
    if (savingRef.current) return
    setModalOpen(false)
    // 关闭窗口也保留部分成功状态，表单仍可重新填密钥并继续重试。
    if (!committedRef.current) {
      setConfirmation(null)
      onLockChange(false)
    }
  }
  const keyInput = () => React.createElement('input', {
    type: 'text', value: provider.apiKey, autoComplete: 'off', disabled: saving, style: controlStyle,
    onChange: (event) => setProvider((current) => ({ ...current, apiKey: event.target.value })),
  })
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 } },
    ...['route', 'displayName', 'baseURL'].map((key) => Field(t(key), React.createElement('input', {
      type: 'text', value: provider[key], autoComplete: 'off', disabled, style: controlStyle,
      placeholder: key === 'route' ? 'my-provider' : key === 'baseURL'
        ? provider.api === 'anthropic-messages' ? 'https://gateway.example' : 'https://gateway.example/v1' : '',
      onChange: (event) => setProvider((current) => ({ ...current, [key]: event.target.value })),
    }), key)),
    Field(t('api'), React.createElement('select', {
      value: provider.api, disabled, style: controlStyle,
      onChange: (event) => setProvider((current) => ({ ...current, api: event.target.value })),
    }, ...PROTOCOLS.map((api) => React.createElement('option', { key: api, value: api }, {
      'openai-completions': 'OpenAI Chat Completions',
      'openai-responses': 'OpenAI Responses',
      'anthropic-messages': 'Anthropic Messages',
    }[api]))))),
    React.createElement('p', { style: { margin: 0, fontSize: 12 } }, t('baseURLHelp')),
    Field(t('apiKey'), keyInput()),
    React.createElement('p', { style: { margin: 0, fontSize: 12 } }, t('keyHelp')),
    React.createElement(ModelList, { t, history: historyModels(snapshot.providers), models, setModels, disabled }),
    React.createElement(Notice, { notice }),
    React.createElement(Button, { variant: 'outline', disabled: committed ? saving : disabled, onClick: requestSave }, t(committed ? 'retryKey' : 'create')),
    React.createElement(Modal, {
      open: modalOpen, onClose: closeConfirmation, title: t('createConfirm'), closeLabel: t('close'),
      description: confirmation ? `${t('createDescription')} ${confirmation.profile.displayName || confirmation.route} (${confirmation.route}) · ${confirmation.profile.api} · ${confirmation.profile.baseURL} · ${confirmation.profile.models.map((model) => model.id).join(', ')}` : '',
      footer: React.createElement(React.Fragment, null,
        React.createElement(Button, { variant: 'outline', disabled: saving, onClick: closeConfirmation, 'data-modal-autofocus': true }, t(committed ? 'close' : 'cancel')),
        React.createElement(Button, { variant: 'outline', disabled: saving, onClick: confirmSave }, t(saving ? 'saving' : committed ? 'retryKey' : 'confirm'))),
    },
    committed && Field(t('apiKey'), keyInput()),
    React.createElement(Notice, { notice })))
}

function ModelManagerSection({ ctx, t }) {
  const [snapshot, setSnapshot] = React.useState({ loading: true, error: null, writable: false, providers: [] })
  const [providerId, setProviderId] = React.useState('')
  const [mode, setMode] = React.useState('new')
  const [newProviderLocked, setNewProviderLocked] = React.useState(false)
  const [models, setModels] = React.useState(() => [emptyDraft()])
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
      const [directory, settings, registered] = await Promise.all([
        ctx.remote.llm.listConfigurableProviders(),
        ctx.remote.settings.describe(),
        ctx.remote.llm.listProviders(),
      ])
      if (!directory.ok) throw new Error(directory.error.message)
      if (!settings.ok) throw new Error(settings.error.message)
      if (!registered.ok) throw new Error(registered.error.message)
      const result = configuredModelProviders(directory.value, settings.value, registered.value)
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

  const requestSave = () => {
    if (savingRef.current || !selectedProvider || snapshot.loading || snapshot.error) return
    if (!snapshot.writable) {
      setNotice({ type: 'error', message: t('readOnly') })
      return
    }
    const validation = validateModelDrafts(models, selectedProvider.models)
    if (validation.error) {
      setNotice({ type: 'error', message: `#${validation.index + 1}: ${t(validation.error)}` })
      return
    }
    try {
      setConfirmation({ provider: selectedProvider, models: validation.value })
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
      const { provider, models: newModels } = confirmation
      const response = await ctx.remote.settings.mutate(
        MODEL_SETTINGS_NAMESPACE,
        [{ op: 'set', path: modelSettingsPath(provider), value: [...provider.models, ...newModels] }],
        provider.revision,
      )
      if (!response.ok) {
        if (response.error.code === 'settings/conflict') {
          setConfirmation(null)
          setNotice({ type: 'error', message: t('conflict') })
          await reload()
        } else {
          setNotice({ type: 'error', message: `${t('saveFailed')}${response.error.message}` })
        }
        return
      }
      setConfirmation(null)
      setModels([emptyDraft()])
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
      setModels([emptyDraft()])
      setNotice(null)
    },
    style: controlStyle,
  }, React.createElement('option', { value: '' }, t('chooseProvider')),
  ...snapshot.providers.map((provider) => React.createElement('option', {
    key: provider.provider,
    value: provider.provider,
  }, `${provider.displayName} (${provider.provider})`)))

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
    Field(t('mode'), React.createElement('select', {
      value: mode, disabled: saving || newProviderLocked || confirmation !== null, style: controlStyle,
      onChange: (event) => { setMode(event.target.value); setNotice(null) },
    }, React.createElement('option', { value: 'new' }, t('newProvider')),
    React.createElement('option', { value: 'existing' }, t('existingProvider')))),
    !snapshot.writable && !snapshot.loading && !snapshot.error && React.createElement('p', { role: 'status', style: { margin: 0 } }, t('readOnly')),
    mode === 'new' ? React.createElement(NewProviderForm, { ctx, t, snapshot, reload, onLockChange: setNewProviderLocked })
      : React.createElement(React.Fragment, null,
    !snapshot.loading && !snapshot.error && snapshot.providers.length === 0 && React.createElement('p', { role: 'status', style: { margin: 0 } }, t('noProviders')),
    Field(t('provider'), providerSelect),
    React.createElement(ModelList, { t, history, models, setModels, disabled }),
    React.createElement(Notice, { notice }),
    React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
      React.createElement(Button, { variant: 'outline', disabled, onClick: requestSave }, t('add'))))),
    React.createElement(Modal, {
      open: confirmation !== null,
      onClose: () => { if (!savingRef.current) setConfirmation(null) },
      title: t('confirmTitle'),
      closeLabel: t('close'),
      description: confirmation
        ? `${t('confirmDescription')} ${confirmation.provider.displayName}: ${confirmation.models.map((model) => `${model.id} (${model.name})`).join(', ')}`
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
    }, React.createElement(Notice, { notice })))
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
