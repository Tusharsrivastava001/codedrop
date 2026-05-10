import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ViewSnippet from './pages/ViewSnippet.jsx';
import Recent from './pages/Recent.jsx';

const colors = {
  bg: '#0f1117',
  text: '#e2e8f0',
  muted: '#94a3b8',
  accent: '#7c3aed',
  card: '#1e2130',
  border: '#30364a'
};

const layoutStyles = {
  minHeight: '100vh',
  background: colors.bg,
  color: colors.text,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
};

const headerStyles = {
  borderBottom: `1px solid ${colors.border}`,
  background: '#121520',
  position: 'sticky',
  top: 0,
  zIndex: 10
};

const navStyles = {
  width: 'min(1100px, calc(100% - 32px))',
  margin: '0 auto',
  minHeight: 68,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap'
};

const linkBase = {
  color: colors.text,
  textDecoration: 'none',
  padding: '9px 12px',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14
};

function AppShell() {
  const location = useLocation();
  const [copiedPath, setCopiedPath] = useState('');

  useEffect(() => {
    setCopiedPath('');
  }, [location.pathname]);

  const navLink = (path, label) => ({
    ...linkBase,
    background: location.pathname === path ? colors.accent : 'transparent',
    border: location.pathname === path ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`
  });

  return (
    <div style={layoutStyles}>
      <header style={headerStyles}>
        <nav style={navStyles}>
          <Link to="/" style={{ ...linkBase, padding: 0, fontSize: 24, letterSpacing: 0 }}>
            CodeDrop
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/" style={navLink('/', 'Create')}>
              Create
            </Link>
            <Link to="/recent" style={navLink('/recent', 'Recent')}>
              Recent
            </Link>
          </div>
        </nav>
      </header>
      <main style={{ width: 'min(1100px, calc(100% - 32px))', margin: '0 auto', padding: '32px 0 56px' }}>
        <Routes>
          <Route path="/" element={<Home colors={colors} />} />
          <Route path="/recent" element={<Recent colors={colors} />} />
          <Route
            path="/s/:id"
            element={<ViewSnippet colors={colors} copiedPath={copiedPath} setCopiedPath={setCopiedPath} />}
          />
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </React.StrictMode>
);
