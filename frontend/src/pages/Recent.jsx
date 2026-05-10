import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentSnippets } from '../api.js';

export default function Recent({ colors }) {
  const [snippets, setSnippets] = useState([]);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRecent();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p style={{ color: colors.muted }}>Loading recent snippets...</p>;
  }

  if (error) {
    return <div style={{ color: '#fecaca', background: '#3b1721', border: '1px solid #7f1d1d', borderRadius: 8, padding: 14 }}>{error}</div>;
  }

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div>
        <p style={{ color: colors.accent, fontWeight: 800, margin: '0 0 8px' }}>served from: {source}</p>
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.12, letterSpacing: 0 }}>Recent snippets</h1>
      </div>

      {snippets.length === 0 ? (
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 22 }}>
          <p style={{ color: colors.muted, margin: 0 }}>No snippets have been shared yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {snippets.map((snippet) => (
            <Link
              key={snippet.id}
              to={`/s/${snippet.id}`}
              style={{
                display: 'grid',
                gap: 8,
                textDecoration: 'none',
                color: colors.text,
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: 18
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 18 }}>{snippet.title}</strong>
                <span style={{ color: colors.accent, fontWeight: 800 }}>{snippet.language}</span>
              </div>
              <span style={{ color: colors.muted }}>
                {snippet.views} views · {new Date(snippet.created_at).toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
