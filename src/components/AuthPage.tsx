import { useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api'
import type { AuthResponse } from '../types'
import BrandMark from './BrandMark'
import ThemeToggle, { type Theme } from './ThemeToggle'

export type AuthMode = 'signup' | 'signin'

type AuthPageProps = {
  mode: AuthMode
  theme: Theme
  error: string
  onThemeToggle: () => void
  onModeChange: (mode: AuthMode) => void
  onErrorChange: (error: string) => void
  onAuthenticated: (result: AuthResponse) => void
}

export default function AuthPage({
  mode,
  theme,
  error,
  onThemeToggle,
  onModeChange,
  onErrorChange,
  onAuthenticated,
}: AuthPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignup = mode === 'signup'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onErrorChange('')
    setBusy(true)

    try {
      const result = await apiRequest<AuthResponse>(
        `/api/auth/${isSignup ? 'signup' : 'signin'}`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...(isSignup ? { name } : {}),
            email,
            password,
          }),
        },
      )
      onAuthenticated(result)
    } catch (cause) {
      onErrorChange(
        cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    onModeChange(nextMode)
    onErrorChange('')
  }

  return (
    <main className="auth-page">
      <ThemeToggle
        className="theme-toggle--auth"
        theme={theme}
        onToggle={onThemeToggle}
      />
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
