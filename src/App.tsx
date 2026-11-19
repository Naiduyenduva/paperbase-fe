import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type User = {
  id: string
  name: string
  email: string
  createdAt: string
}

type AuthResponse = {
  token: string
  user: User
}

type ApiErrorResponse = {
  error?: string
  details?: Record<string, string[]>
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'paperbase_token'

class ApiError extends Error {
  readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <a className={`brand${compact ? ' brand--compact' : ''}`} href="/" aria-label="Paperbase home">
      <span className="brand__icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M8 5.5h11l5 5V26H8V5.5Z" />
          <path d="M19 5.5v5h5M12 15h8M12 19h8M12 23h5" />
        </svg>
      </span>
      <span>paperbase</span>
    </a>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [sessionLoading, setSessionLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  )
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) return

    void apiRequest<{ user: User }>('me', { method: 'GET' }, token)
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser)
      })
      .catch((cause: unknown) => {
        if (!active) return
        if (cause instanceof ApiError && cause.status === 401) {
          localStorage.removeItem(TOKEN_KEY)
        } else {
          setError(cause instanceof Error ? cause.message : 'Unable to restore your session.')
        }
      })
      .finally(() => {
        if (active) setSessionLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      const isSignup = mode === 'signup'
      const result = await apiRequest<AuthResponse>(
        isSignup ? 'signup' : 'signin',
        {
          method: 'POST',
          body: JSON.stringify({
            ...(isSignup ? { name } : {}),
            email,
            password,
          }),
        },
      )
      localStorage.setItem(TOKEN_KEY, result.token)
      setUser(result.user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function changeMode(nextMode: 'signup' | 'signin') {
    setMode(nextMode)
    setError('')
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setPassword('')
    setError('')
  }

  if (sessionLoading) {
    return (
      <main className="loading-screen" aria-live="polite">
        <span className="loader" />
        <p>Getting your workspace ready…</p>
      </main>
    )
  }

  if (user) {
    const initials = user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()

    return (
      <main className="dashboard">
        <header className="topbar">
          <BrandMark compact />
          <div className="topbar__actions">
            <span className="topbar__label">Your workspace</span>
            <span className="avatar" aria-label={`Signed in as ${user.name}`}>
              {initials}
            </span>
            <button className="text-button" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>

        <section className="welcome">
          <span className="eyebrow"><span className="status-dot" /> YOUR PAPERBASE</span>
          <h1>Welcome in, {user.name.split(/\s+/)[0]}.</h1>
          <p>Your account is ready. This is the start of your space.</p>
        </section>

        <section className="dashboard-grid" aria-label="Your account">
          <article className="welcome-card">
            <div className="welcome-card__copy">
              <span className="card-kicker">A fresh start</span>
              <h2>A little more room for your ideas.</h2>
              <p>
                You’re all set up with Paperbase. Come back anytime and pick up
                right where you left off.
              </p>
            </div>
            <div className="paper-illustration" aria-hidden="true">
              <div className="paper-illustration__back" />
              <div className="paper-illustration__front">
                <span />
                <span />
                <span />
                <i />
              </div>
              <div className="paper-illustration__spark">✳</div>
            </div>
          </article>

          <article className="account-card">
            <div className="account-card__heading">
              <span className="account-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.5-3.4 3.2-5.2 7-5.2s6.5 1.8 7 5.2" />
                </svg>
              </span>
              <div>
                <h2>Your account</h2>
                <p>Signed in and ready to go</p>
              </div>
            </div>
            <dl className="account-details">
              <div>
                <dt>Name</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Email address</dt>
                <dd>{user.email}</dd>
              </div>
            </dl>
            <div className="account-card__footer">
              <span className="status-dot" />
              Account active
            </div>
          </article>
        </section>

        <footer className="dashboard-footer">
          <BrandMark compact />
          <span>A thoughtful space for what’s next.</span>
        </footer>
      </main>
    )
  }

  const isSignup = mode === 'signup'

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="About Paperbase">
        <BrandMark />
        <div className="story-content">
          <span className="eyebrow"><span className="eyebrow-line" /> A CLEARER WAY TO BEGIN</span>
          <h1>Make space<br />for what<br /><em>matters.</em></h1>
          <p>A calm place to gather your thoughts and make them your own.</p>
          <div className="story-art" aria-hidden="true">
            <div className="story-art__sun" />
            <div className="story-art__sheet story-art__sheet--back" />
            <div className="story-art__sheet story-art__sheet--front">
              <span />
              <span />
              <span />
              <i />
            </div>
            <div className="story-art__spark story-art__spark--one">✳</div>
            <div className="story-art__spark story-art__spark--two">✦</div>
          </div>
        </div>
        <p className="story-footnote">A little more room to think.</p>
      </section>

      <section className="auth-panel" aria-labelledby="form-title">
        <div className="mobile-brand"><BrandMark compact /></div>
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
            <h2 id="form-title">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
            <p>
              {isSignup
                ? 'A few details and you’re on your way.'
                : 'Sign in to pick up where you left off.'}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              className={isSignup ? 'auth-tab auth-tab--active' : 'auth-tab'}
              id="signup-tab"
              type="button"
              role="tab"
              aria-selected={isSignup}
              onClick={() => changeMode('signup')}
            >
              Sign up
            </button>
            <button
              className={!isSignup ? 'auth-tab auth-tab--active' : 'auth-tab'}
              id="signin-tab"
              type="button"
              role="tab"
              aria-selected={!isSignup}
              onClick={() => changeMode('signin')}
            >
              Sign in
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <label className="field">
                <span>Your name</span>
                <input
                  autoComplete="name"
                  name="name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required
                  minLength={2}
                  value={name}
                />
              </label>
            )}
            <label className="field">
              <span>Email address</span>
              <input
                autoComplete="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                required
                minLength={isSignup ? 8 : 1}
                type="password"
                value={password}
              />
            </label>

            {error && (
              <div className="form-error" role="alert">
                <span aria-hidden="true">!</span>
                {error}
              </div>
            )}

            <button className="submit-button" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <span className="button-loader" />
                  {isSignup ? 'Creating your account…' : 'Signing you in…'}
                </>
              ) : (
                <>
                  {isSignup ? 'Create account' : 'Sign in'}
                  <span aria-hidden="true">↗</span>
                </>
              )}
            </button>
          </form>

          <p className="form-note">
            {isSignup ? 'Already have an account?' : 'New to Paperbase?'}{' '}
            <button
              className="inline-link"
              type="button"
              onClick={() => changeMode(isSignup ? 'signin' : 'signup')}
            >
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
        <p className="auth-legal">By continuing, you agree to keep your ideas in good company.</p>
      </section>
    </main>
  )
}

export default App
