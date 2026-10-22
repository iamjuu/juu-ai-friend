async function request(path, options = {}) {
  const { signal, headers, ...rest } = options
  const response = await fetch(path, {
    signal,
    headers: {
      ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...rest,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const error = new Error(data?.message || data?.detail || 'Request failed')
    error.status = response.status
    error.payload = data
    error.code = data?.error
    throw error
  }

  return data
}

export const api = {
  health: () => request('/api/health'),
  status: () => request('/api/ai/status'),
  listConversations: () => request('/api/conversations'),
  createConversation: (body = {}) =>
    request('/api/conversations', { method: 'POST', body: JSON.stringify(body) }),
  getConversation: (id) => request(`/api/conversations/${id}`),
  deleteConversation: (id) => request(`/api/conversations/${id}`, { method: 'DELETE' }),
  chat: (body, signal) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify(body), signal }),
  transcribe: (blob, signal) => {
    const form = new FormData()
    form.append('audio', blob, blob.name || 'speech.webm')
    return request('/api/speech/transcribe', { method: 'POST', body: form, signal })
  },
  synthesize: (body, signal) =>
    request('/api/speech/synthesize', { method: 'POST', body: JSON.stringify(body), signal }),
  getPreferences: () => request('/api/preferences'),
  updatePreferences: (body) =>
    request('/api/preferences', { method: 'PUT', body: JSON.stringify(body) }),
}
