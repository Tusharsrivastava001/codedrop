import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ViewSnippet from './pages/ViewSnippet.jsx';
import Recent from './pages/Recent.jsx';
import Stats from './pages/Stats.jsx';
import Search from './pages/Search.jsx';
import { ToastProvider } from './ToastContext.jsx';

export const colors = {
  bg: '#0A0E1A',
  card: '#0F1629',
  cardSoft: 'rgba(15, 22, 41, 0.72)',
  border: '#1E2D4A',
  accent: '#6366F1',
  success: '#10B981',
  danger: '#EF4444',
  text: '#F8FAFC',
  muted: '#94A3B8',
  blue: '#3B82F6'
};

export const shared = {
  page: {
    width: 'min(1180px, calc(100% - 32px))',
    margin: '0 auto'
  },
  card: {
    background: 'rgba(15, 22, 41, 0.78)',
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 18px 60px rgba(0, 0, 0, 0.28)'
  },
  button: {
    border: 0,
    borderRadius: 8,
    background: colors.accent,
    color: '#FFFFFF',
    cursor: 'pointer',
    fontWeight: 700,
    padding: '11px 14px',
    textDecoration: 'none',
    transition: 'transform 160ms ease, opacity 160ms ease, background 160ms ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${colors.border}`,
    background: 'rgba(10, 14, 26, 0.72)',
    color: colors.text,
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 160ms ease, box-shadow 160ms ease'
  }
};

function NotFound() {
  return (
    <section style={{ ...shared.card, padding: 28, textAlign: 'center', display: 'grid', gap: 14 }}>
      <h1 style={{ margin: 0, fontSize: 36, letterSpacing: 0 }}>Snippet not found or expired</h1>
      <p style={{ color: colors.muted, margin: 0 }}>That link may have expired, burned after reading, or never existed.</p>
      <Link to="/" style={{ ...shared.button, justifySelf: 'center' }}>New Snippet</Link>
    </section>
  );
}

function AppShell() {
  const location = useLocation();
  const navItems = useMemo(() => [
    { to: '/recent', label: 'Recent' },
    { to: '/', label: 'New Snippet' }
  ], []);

  return (
    <div
      style={{
        minHeight: '100vh',
        color: colors.text,
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background:
          'radial-gradient(circle at top left, rgba(99, 102, 241, 0.18), transparent 32%), radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.1), transparent 28%), #0A0E1A',
        opacity: 1,
        transition: 'opacity 260ms ease'
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(10, 14, 26, 0.78)',
          borderBottom: `1px solid ${colors.border}`,
          backdropFilter: 'blur(10px)'
        }}
      >
        <nav
          style={{
            ...shared.page,
            minHeight: 66,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <Link to="/" style={{ color: colors.text, textDecoration: 'none', fontWeight: 800, fontSize: 22, letterSpacing: 0 }}>
            &lt;/&gt; CodeDrop
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  color: colors.text,
                  textDecoration: 'none',
                  border: `1px solid ${location.pathname === item.to ? colors.accent : colors.border}`,
                  background: location.pathname === item.to ? 'rgba(99, 102, 241, 0.24)' : 'rgba(15, 22, 41, 0.55)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  fontWeight: 700,
                  fontSize: 14,
                  transition: 'background 160ms ease, border-color 160ms ease'
                }}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
              title="GitHub repository"
              style={{ ...shared.button, background: 'rgba(15, 22, 41, 0.76)', border: `1px solid ${colors.border}`, padding: '9px 11px' }}
            >
              GitHub
            </a>
          </div>
        </nav>
      </header>

      <main style={{ ...shared.page, padding: '34px 0 54px' }}>
        <Routes>
          <Route path="/" element={<Home colors={colors} shared={shared} />} />
          <Route path="/recent" element={<Recent colors={colors} shared={shared} />} />
          <Route path="/stats" element={<Stats colors={colors} />} />
          <Route path="/search" element={<Search colors={colors} />} />
          <Route path="/s/:id" element={<ViewSnippet colors={colors} shared={shared} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer
        style={{
          borderTop: `1px solid ${colors.border}`,
          color: colors.muted,
          padding: '22px 16px',
          textAlign: 'center',
          background: 'rgba(10, 14, 26, 0.78)'
        }}
      >
        Built with Docker + GitHub Actions · Node.js · React · PostgreSQL · Redis · Prometheus · Grafana
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
