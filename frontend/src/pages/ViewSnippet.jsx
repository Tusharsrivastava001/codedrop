import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE_URL, getSnippet, unlockSnippet } from '../api.js';
import { useToast } from '../ToastContext.jsx';

const dotColors = {
  js: '#10B981',
  ts: '#38BDF8',
  python: '#3B82F6',
  java: '#EF4444',
  go: '#06B6D4',
  rust: '#F97316',
  bash: '#84CC16',
  sql: '#A855F7',
  json: '#FACC15',
  html: '#FB7185',
  css: '#60A5FA',
  yaml: '#F59E0B',
  markdown: '#94A3B8',
  plaintext: '#94A3B8'
};

const extensionByLanguage = {
  js: 'js',
  ts: 'ts',
  python: 'py',
  java: 'java',
  go: 'go',
  rust: 'rs',
  bash: 'sh',
  sql: 'sql',
  json: 'json',
  html: 'html',
  css: 'css',
  yaml: 'yml',
  markdown: 'md',
  plaintext: 'txt'
};

function formatRemaining(expiresAt) {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const minutes = Math.ceil(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `Expires in ${days}d ${hours}h`;
  if (hours) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
}

export default function ViewSnippet({ colors, shared }) {
  const { id } = useParams();
  const { pushToast } = useToast();
  const codeRef = useRef(null);
  const qrRef = useRef(null);
  const [snippet, setSnippet] = useState(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [copied, setCopied] = useState('');
  const [countdown, setCountdown] = useState('');

  const shareUrl = useMemo(() => `${window.location.origin}/s/${id}`, [id]);
  const rawUrl = `${API_BASE_URL}/snippets/${id}/raw`;

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
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSnippet();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (snippet?.code && codeRef.current && window.hljs) {
      codeRef.current.removeAttribute('data-highlighted');
      window.hljs.highlightElement(codeRef.current);
    }
  }, [snippet]);

  useEffect(() => {
    if (!qrRef.current || !window.QRCode) return;
    qrRef.current.innerHTML = '';
    new window.QRCode(qrRef.current, {
      text: shareUrl,
      width: 128,
      height: 128,
      colorDark: '#F8FAFC',
      colorLight: '#0F1629'
    });
  }, [shareUrl, snippet?.id]);

  useEffect(() => {
    if (!snippet?.expires_at) {
      setCountdown('');
      return undefined;
    }
    const update = () => setCountdown(formatRemaining(snippet.expires_at));
    update();
    const timer = window.setInterval(update, 30000);
    return () => window.clearInterval(timer);
  }, [snippet?.expires_at]);

  async function copyText(text, label) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    pushToast(`${label} copied.`, 'success');
    window.setTimeout(() => setCopied(''), 1400);
  }

  async function handleUnlock(event) {
    event.preventDefault();
    setUnlocking(true);
    setError('');
    try {
      const response = await unlockSnippet(id, password);
      if (!response.valid) {
        setError('Wrong password');
        pushToast('Wrong password.', 'error');
        return;
      }
      setSnippet(response.data);
      setPassword('');
      pushToast('Snippet unlocked.', 'success');
    } catch (err) {
      setError(err.message);
      pushToast(err.message, 'error');
    } finally {
      setUnlocking(false);
    }
  }

  function downloadSnippet() {
    if (!snippet?.code) return;
    const extension = extensionByLanguage[snippet.language] || 'txt';
    const filename = `${snippet.title.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40) || 'snippet'}.${extension}`;
    const blob = new Blob([snippet.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast('Download started.', 'info');
  }

  if (loading) {
    return <p style={{ color: colors.muted }}>Loading snippet...</p>;
  }

  if (error && !snippet) {
    const burned = error.toLowerCase().includes('burned');
    return (
      <section style={{ ...shared.card, padding: 28, textAlign: 'center', display: 'grid', gap: 14 }}>
        <h1 style={{ margin: 0, fontSize: 38, letterSpacing: 0 }}>{burned ? 'Snippet burned' : 'Snippet not found or expired'}</h1>
        <p style={{ color: colors.muted, margin: 0 }}>{burned ? 'This burn-after-read snippet has already been viewed.' : error}</p>
        <Link to="/" style={{ ...shared.button, justifySelf: 'center' }}>Create New Snippet</Link>
      </section>
    );
  }

  const underOneHour = snippet?.expires_at && new Date(snippet.expires_at).getTime() - Date.now() < 60 * 60 * 1000;
  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: `1px solid ${colors.border}`,
    background: 'rgba(10, 14, 26, 0.58)',
    borderRadius: 8,
    padding: '7px 10px',
    color: colors.text,
    fontWeight: 700,
    fontSize: 13
  };

  return (
    <article style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={badgeStyle}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: dotColors[snippet.language] || dotColors.plaintext }} />
              {snippet.language}
            </span>
            <span style={badgeStyle}>{snippet.views || 0} views</span>
            {countdown ? <span style={{ ...badgeStyle, color: underOneHour ? colors.danger : colors.text }}>{countdown}</span> : null}
            {snippet.burn_after_read ? <span style={{ ...badgeStyle, color: colors.danger }}>Burn after read</span> : null}
          </div>
          <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.12, letterSpacing: 0 }}>{snippet.title}</h1>
          <p style={{ color: colors.muted, margin: '10px 0 0' }}>
            Created {new Date(snippet.created_at).toLocaleString()} · served from {source || 'api'}
          </p>
        </div>
        <Link to="/" style={shared.button}>New Snippet</Link>
      </div>

      <div style={{ ...shared.card, padding: 14, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10 }}>
        <input readOnly value={shareUrl} style={shared.input} />
        <button type="button" onClick={() => copyText(shareUrl, 'Link')} style={{ ...shared.button, background: copied === 'Link' ? colors.success : colors.accent }}>
          {copied === 'Link' ? '✓ Copied' : 'Copy Link'}
        </button>
      </div>

      {snippet.locked ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 14, 26, 0.74)', backdropFilter: 'blur(7px)', zIndex: 50, display: 'grid', placeItems: 'center', padding: 18 }}>
          <form onSubmit={handleUnlock} style={{ ...shared.card, width: 'min(420px, 100%)', padding: 24, display: 'grid', gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: 24, letterSpacing: 0 }}>Password required</h2>
            <p style={{ margin: 0, color: colors.muted }}>Enter the password to reveal this snippet.</p>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus style={shared.input} />
            {error ? <div style={{ color: '#FECACA', background: 'rgba(239, 68, 68, 0.12)', border: `1px solid ${colors.danger}`, borderRadius: 8, padding: 12 }}>{error}</div> : null}
            <button type="submit" disabled={unlocking} style={{ ...shared.button, justifySelf: 'start' }}>
              {unlocking ? 'Unlocking...' : 'Unlock Snippet'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px', gap: 16, alignItems: 'start' }}>
            <div style={{ ...shared.card, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 12, borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
                <strong>{snippet.title}.{extensionByLanguage[snippet.language] || 'txt'}</strong>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => copyText(snippet.code, 'Code')} style={{ ...shared.button, padding: '9px 11px', background: copied === 'Code' ? colors.success : colors.accent }}>
                    {copied === 'Code' ? '✓' : 'Copy'}
                  </button>
                  <button type="button" onClick={downloadSnippet} style={{ ...shared.button, padding: '9px 11px', background: 'rgba(99, 102, 241, 0.34)', border: `1px solid ${colors.accent}` }}>
                    Download
                  </button>
                  <a href={rawUrl} target="_blank" rel="noreferrer" style={{ ...shared.button, padding: '9px 11px', background: 'rgba(15, 22, 41, 0.78)', border: `1px solid ${colors.border}` }}>
                    Raw
                  </a>
                </div>
              </div>
              <pre style={{ margin: 0, overflowX: 'auto', whiteSpace: 'pre', padding: 20, fontSize: 14, lineHeight: 1.6, fontFamily: 'Consolas, "SFMono-Regular", monospace' }}>
                <code ref={codeRef} className={`language-${snippet.language}`}>{snippet.code}</code>
              </pre>
            </div>

            <aside style={{ ...shared.card, padding: 14, display: 'grid', gap: 12, justifyItems: 'center' }}>
              <div ref={qrRef} style={{ width: 128, height: 128 }} />
              <button type="button" onClick={() => copyText(shareUrl, 'Link')} style={{ ...shared.button, width: '100%' }}>Copy Link</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" style={{ ...shared.button, width: '100%', background: colors.success }}>WhatsApp</a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`CodeDrop snippet: ${shareUrl}`)}`} target="_blank" rel="noreferrer" style={{ ...shared.button, width: '100%', background: colors.blue }}>Twitter/X</a>
            </aside>
          </div>
        </>
      )}
    </article>
  );
}
