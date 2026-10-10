type ResponseShape = { data: any; status: number }

async function request(method: string, path: string, body?: unknown): Promise<ResponseShape> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('playbeat_admin_token') : null
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const raw = await response.text()
  let data: any = null
  if (raw) { try { data = JSON.parse(raw) } catch { data = raw } }
  if (!response.ok) {
    const error: any = new Error(data?.error || `Request failed (${response.status})`)
    error.response = { data, status: response.status }
    throw error
  }
  return { data, status: response.status }
}

const crmHttp = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: unknown) => request('POST', path, body),
  patch: (path: string, body?: unknown) => request('PATCH', path, body),
}

export default crmHttp
