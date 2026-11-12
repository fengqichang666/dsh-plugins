import { MODEL_SETTINGS_NAMESPACE } from './model-data.js'

export const PROTOCOLS = ['openai-completions', 'openai-responses', 'anthropic-messages']

export function validateApiKey(draft) {
  if (draft === '') return undefined // 本地无鉴权服务允许不填写密钥。
  const value = draft.trim()
  if (!/^[\x21-\x7E]+$/.test(value) || /^[A-Z][A-Z0-9_]*=[^=]/.test(value)
    || /^(["']).*\1$/.test(value)) return 'keyInvalid'
}

export function validateProviderDraft(draft, taken) {
  const route = draft.route.trim()
  const baseURL = draft.baseURL.trim()
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(route)) return { error: 'routeInvalid' }
  if (taken.includes(route)) return { error: 'routeTaken' }
  if (!PROTOCOLS.includes(draft.api)) return { error: 'protocolInvalid' }
  try {
    const url = new URL(baseURL)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      return { error: 'baseURLInvalid' }
    }
  } catch {
    return { error: 'baseURLInvalid' }
  }
  const keyError = validateApiKey(draft.apiKey)
  if (keyError) return { error: keyError }
  const keyRef = `${route.toUpperCase().replace(/-/g, '_')}_API_KEY`
  const displayName = draft.displayName.trim()
  return {
    value: {
      route,
      keyRef,
      profile: {
        ...(displayName ? { displayName } : {}),
        ...(draft.apiKey ? { apiKeyEnv: keyRef } : {}),
        api: draft.api,
        baseURL,
      },
    },
  }
}

// 配置与凭据是两次独立写入。配置成功后立即记录，密钥失败重试时不再创建提供商。
export async function saveNewProvider(remote, creation, key, committed, onCommitted) {
  if (!committed) {
    const response = await remote.settings.mutate(
      MODEL_SETTINGS_NAMESPACE,
      [{ op: 'set', path: ['providers', creation.route], value: creation.profile }],
      creation.revision,
    )
    if (!response.ok) return { stage: 'settings', error: response.error }
    onCommitted()
  }
  if (creation.profile.apiKeyEnv) {
    // 不将凭据接口的原始错误显示出来，避免服务端错误回显密钥。
    try {
      const response = await remote.credentials.set(creation.keyRef, key.trim())
      if (!response.ok) return { stage: 'credentials' }
    } catch {
      return { stage: 'credentials' }
    }
  }
  return { ok: true }
}
