import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentSnippets } from '../api.js';

const languageLabels = ['All', 'js', 'ts', 'python', 'go', 'rust', 'bash', 'sql', 'json', 'html', 'css'];

function preview(code = '') {
  return code.split('\n').slice(0, 3).join('\n') || 'No preview available';
}

function expiryScore(snippet) {
  return snippet.expires_at ? new Date(snippet.expires_at).getTime() : Number.MAX_SAFE_INTEGER;
}

export default function Recent({ colors, shared }) {
  const [snippets, setSnippets] = useState([]);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('All');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    async function loadRecent() {
      setLoading(true);
      setError('');
      try {
        const response = await getRecentSnippets();
        if (active) {
          setSnippets(response.data);
          setSource(response.source);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRecent();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, language, sort]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return snippets
      .filter((snippet) => {
        const matchesQuery = !needle || snippet.title.toLowerCase().includes(needle) || snippet.language.toLowerCase().includes(needle);
        const matchesLanguage = language === 'All' || snippet.language === language;
        return matchesQuery && matchesLanguage;
      })
      .sort((a, b) => {
        if (sort === 'views') return Number(b.views || 0) - Number(a.views || 0);
        if (sort === 'expiring') return expiryScore(a) - expiryScore(b);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [snippets, query, language, sort]);

  const totalPages = Math.max(Math.ceil(filtered.length / 10), 1);
  const pageItems = filtered.slice((page - 1) * 10, page * 10);

  if (loading) return <p style={{ color: colors.muted }}>Loading recent snippets...</p>;
  if (error) return <div style={{ color: '#FECACA', background: 'rgba(239, 68, 68, 0.12)', border: `1px solid ${colors.danger}`, borderRadius: 8, padding: 14 }}>{error}</div>;

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div>
        <p style={{ color: colors.accent, fontWeight: 800, margin: '0 0 8px' }}>served from: {source || 'api'}</p>
        <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.12, letterSpacing: 0 }}>Recent Snippets</h1>
      </div>

      <div style={{ ...shared.card, padding: 16, display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 190px', gap: 12 }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or language" style={shared.input} />
          <select value={sort} onChange={(event) => setSort(event.target.value)} style={shared.input}>
            <option value="newest">Newest</option>
            <option value="views">Most Viewed</option>
            <option value="expiring">Expiring Soon</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {languageLabels.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLanguage(item)}
              style={{
                ...shared.button,
                padding: '8px 11px',
                background: language === item ? colors.accent : 'rgba(10, 14, 26, 0.62)',
                border: `1px solid ${language === item ? colors.accent : colors.border}`
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div style={{ ...shared.card, padding: 28, display: 'grid', justifyItems: 'center', gap: 14, textAlign: 'center' }}>
          <svg width="180" height="120" viewBox="0 0 180 120" role="img" aria-label="No results">
            <rect x="26" y="18" width="128" height="84" rx="8" fill="#0A0E1A" stroke="#1E2D4A" />
            <path d="M48 44h84M48 60h62M48 76h72" stroke="#6366F1" strokeWidth="6" strokeLinecap="round" />
            <circle cx="138" cy="88" r="15" fill="#10B981" opacity="0.8" />
          </svg>
          <strong>No snippets match your filters</strong>
          <span style={{ color: colors.muted }}>Try a different search or language pill.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {pageItems.map((snippet) => (
            <Link key={snippet.id} to={`/s/${snippet.id}`} style={{ ...shared.card, padding: 16, display: 'grid', gap: 10, color: colors.text, textDecoration: 'none', transition: 'transform 160ms ease, border-color 160ms ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong style={{ fontSize: 17 }}>{snippet.title}</strong>
                <span style={{ color: colors.accent, fontWeight: 800 }}>{snippet.language}</span>
              </div>
              <pre style={{ margin: 0, background: 'rgba(10, 14, 26, 0.72)', border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.muted, padding: 12, overflow: 'hidden', minHeight: 82, fontFamily: 'Consolas, monospace', fontSize: 13, lineHeight: 1.45 }}>
                <code>{preview(snippet.code)}</code>
              </pre>
              <span style={{ color: colors.muted, fontSize: 13 }}>{snippet.views} views · {new Date(snippet.created_at).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(value - 1, 1))} style={{ ...shared.button, opacity: page === 1 ? 0.5 : 1 }}>Prev</button>
        <span style={{ color: colors.muted }}>Page {page} of {totalPages}</span>
        <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(value + 1, totalPages))} style={{ ...shared.button, opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
      </div>
    </section>
  );
}
