import type { User } from '../types'
import BrandMark from './BrandMark'
import DocumentLibrary from './DocumentLibrary'

type DashboardProps = {
  user: User
  onSignOut: () => void
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
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
          <button className="text-button" type="button" onClick={onSignOut}>
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

      <DocumentLibrary />

      <footer className="dashboard-footer">
        <BrandMark compact />
        <span>A thoughtful space for what’s next.</span>
      </footer>
    </main>
  )
}
