import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchSnippets } from '../api.js';

const languages = ['', 'js', 'ts', 'python', 'java', 'go', 'rust', 'bash', 'sql', 'json', 'html', 'css', 'plaintext'];

export default function Search({ colors }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [language, setLanguage] = useState(params.get('lang') || '');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = params.get('q') || '';
    const lang = params.get('lang') || '';
    setQuery(q);
    setLanguage(lang);

    let active = true;
    async function runSearch() {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await searchSnippets(q, lang);
        if (active) {
          setResults(response.data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    runSearch();
    return () => {
      active = false;
    };
  }, [params]);

  function submitSearch(event) {
    event.preventDefault();
    const next = {};
    if (query.trim()) {
      next.q = query.trim();
    }
    if (language) {
      next.lang = language;
    }
    setParams(next);
  }

  const inputStyle = {
    border: `1px solid ${colors.border}`,
    background: '#141824',
    color: colors.text,
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none'
  };

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div>
        <p style={{ color: colors.accent, fontWeight: 800, margin: '0 0 8px' }}>Search snippets</p>
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.12, letterSpacing: 0 }}>Find shared code</h1>
      </div>

      <form onSubmit={submitSearch} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(160px, 220px) auto', gap: 10, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 14 }}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keyword" style={inputStyle} />
        <select value={language} onChange={(event) => setLanguage(event.target.value)} style={inputStyle}>
          {languages.map((item) => (
            <option key={item || 'all'} value={item}>
              {item || 'all languages'}
            </option>
          ))}
        </select>
        <button type="submit" style={{ background: colors.accent, color: '#ffffff', border: 0, borderRadius: 8, padding: '0 18px', fontWeight: 800, cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {loading ? <p style={{ color: colors.muted }}>Searching...</p> : null}
      {error ? <div style={{ color: '#fecaca', background: '#3b1721', border: '1px solid #7f1d1d', borderRadius: 8, padding: 14 }}>{error}</div> : null}

      <div style={{ display: 'grid', gap: 14 }}>
        {!loading && (params.get('q') || '').trim() && results.length === 0 ? (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 18, color: colors.muted }}>
            No matching snippets found.
          </div>
        ) : null}
        {results.map((snippet) => (
          <Link key={snippet.id} to={`/s/${snippet.id}`} style={{ display: 'grid', gap: 8, textDecoration: 'none', color: colors.text, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 18 }}>{snippet.title}</strong>
              <span style={{ color: colors.accent, fontWeight: 800 }}>{snippet.language}</span>
            </div>
            <span style={{ color: colors.muted }}>
              {snippet.views} views - {new Date(snippet.created_at).toLocaleString()}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
