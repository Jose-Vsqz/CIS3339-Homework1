// Relative URLs use Vite's proxy in development and the Express origin in production.
export async function request(path, { method = 'GET', body, duplicateMessage } = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error('Unable to reach the server. Check that the backend is running and try again.')
  }
  let result
  try { result = await response.json() } catch {
    throw new Error('The server returned an unreadable response. Check the backend and try again.')
  }
  if (!response.ok) {
    const message = response.status === 409 && duplicateMessage
      ? duplicateMessage : result.error || `Request failed (${response.status}).`
    const error = new Error([message, ...(Array.isArray(result.details) ? result.details : [])].join(' '))
    error.status = response.status
    throw error
  }
  return result
}
