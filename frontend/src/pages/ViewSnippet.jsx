import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSnippet } from '../api.js';

export default function ViewSnippet({ colors, copiedPath, setCopiedPath }) {
  const { id } = useParams();
  const [snippet, setSnippet] = useState(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const shareUrl = useMemo(() => `${window.location.origin}/s/${id}`, [id]);

  useEffect(() => {
    let active = true;

    async function loadSnippet() {
      setLoading(true);
      setError('');
      try {
        const response = await getSnippet(id);
        if (active) {
          setSnippet(response.data);
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

    loadSnippet();
    return () => {
      active = false;
    };
  }, [id]);

  async function copyShareUrl() {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedPath(id);
  }

  if (loading) {
    return <p style={{ color: colors.muted }}>Loading snippet...</p>;
  }

  if (error) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ color: '#fecaca', background: '#3b1721', border: '1px solid #7f1d1d', borderRadius: 8, padding: 14 }}>
          {error}
        </div>
        <Link to="/" style={{ color: colors.accent, fontWeight: 800 }}>
          Create a new snippet
        </Link>
      </div>
    );
  }

  const date = new Date(snippet.created_at).toLocaleString();

  return (
    <article style={{ display: 'grid', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 18,
          flexWrap: 'wrap'
        }}
      >
        <div>
          <p style={{ color: colors.accent, fontWeight: 800, margin: '0 0 8px' }}>{snippet.language}</p>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.15, letterSpacing: 0 }}>{snippet.title}</h1>
          <p style={{ color: colors.muted, margin: '12px 0 0' }}>
            {snippet.views} views · {date} · served from {source}
          </p>
        </div>
        <Link
          to="/"
          style={{
            color: '#ffffff',
            background: colors.accent,
            textDecoration: 'none',
            borderRadius: 8,
            padding: '11px 14px',
            fontWeight: 800
          }}
        >
          Create new
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 10,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: 12
        }}
      >
        <input
          readOnly
          value={shareUrl}
          style={{
            minWidth: 0,
            border: `1px solid ${colors.border}`,
            background: '#141824',
            color: colors.text,
            borderRadius: 8,
            padding: '11px 12px',
            fontSize: 14
          }}
        />
        <button
          onClick={copyShareUrl}
          style={{
            border: 0,
            background: copiedPath === id ? '#16a34a' : colors.accent,
            color: '#ffffff',
            borderRadius: 8,
            padding: '0 16px',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          {copiedPath === id ? 'Copied' : 'Copy'}
        </button>
      </div>

      <pre
        style={{
          margin: 0,
          overflowX: 'auto',
          whiteSpace: 'pre',
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: 22,
          color: colors.text,
          fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
          lineHeight: 1.6,
          fontSize: 14
        }}
      >
        {snippet.code}
      </pre>
    </article>
  );
}
