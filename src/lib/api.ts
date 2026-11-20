const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

type ApiErrorResponse = {
  error?: string
  details?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  let response: Response

  try {
    const headers = new Headers(options.headers)
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (token) headers.set('Authorization', `Bearer ${token}`)

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Unable to connect to Paperbase. Check that the API is running and try again.')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('The server returned an invalid response. Please try again.')
  }

  if (!response.ok) {
    const errorResponse = payload as ApiErrorResponse
    const validationMessage =
      errorResponse.error === 'Validation failed'
        ? Object.values(errorResponse.details ?? {}).flat()[0]
        : undefined
    throw new ApiError(
      validationMessage ?? errorResponse.error ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  return payload as T
}
