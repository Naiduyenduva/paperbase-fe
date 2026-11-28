import { useEffect, useState } from "react";
import AuthPage, { type AuthMode } from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import type { Theme } from "./components/ThemeToggle";
import { ApiError, apiRequest } from "./lib/api";
import type { AuthResponse, User } from "./types";
import "./App.css";

const TOKEN_KEY = "paperbase_token";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );
  const [mode, setMode] = useState<AuthMode>("signup");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem("paperbase_theme") === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("paperbase_theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => currentTheme === "light" ? "dark" : "light");
  }

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) return;

    void apiRequest<{ user: User }>("/api/auth/me", { method: "GET" }, token)
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
        } else {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to restore your session.",
          );
        }
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleAuthenticated(result: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    setError("");
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setError("");
  }

  if (sessionLoading) {
    return (
      <main className="loading-screen" aria-live="polite">
        <span className="loader" />
        <p>Getting your workspace ready…</p>
      </main>
    );
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        theme={theme}
        onThemeToggle={toggleTheme}
        onSignOut={signOut}
      />
    );
  }

  return (
    <AuthPage
      mode={mode}
      theme={theme}
      error={error}
      onThemeToggle={toggleTheme}
      onModeChange={setMode}
      onErrorChange={setError}
      onAuthenticated={handleAuthenticated}
    />
  );
}

export default App;
