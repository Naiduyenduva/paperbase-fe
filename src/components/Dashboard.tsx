import type { User } from '../types'
import BrandMark from './BrandMark'
import DocumentLibrary from './DocumentLibrary'
import ThemeToggle, { type Theme } from './ThemeToggle'

type DashboardProps = {
  user: User
  theme: Theme
  onThemeToggle: () => void
  onSignOut: () => void
}

export default function Dashboard({
  user,
  theme,
  onThemeToggle,
  onSignOut,
}: DashboardProps) {
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
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
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

      <DocumentLibrary />

      <footer className="dashboard-footer">
        <BrandMark compact />
        <span>A thoughtful space for what’s next.</span>
      </footer>
    </main>
  )
}
