import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSnippet } from '../api.js';
import { useToast } from '../ToastContext.jsx';

const languages = ['js', 'ts', 'python', 'java', 'go', 'rust', 'bash', 'sql', 'json', 'html', 'css', 'yaml', 'markdown', 'plaintext'];

function detectLanguage(code) {
  const value = code.trim();
  if (/^\s*[{[]/.test(value)) return 'json';
  if (/\bfunction\b|=>|console\.log|const\s+\w+|import .* from/.test(value)) return 'js';
  if (/\bdef\s+\w+\(|print\(|from\s+\w+\s+import|import\s+\w+/.test(value)) return 'python';
  if (/\bfn\s+\w+\(|let mut|println!|use std::/.test(value)) return 'rust';
  if (/SELECT\s+.*\s+FROM|INSERT\s+INTO|CREATE\s+TABLE/i.test(value)) return 'sql';
  if (/<[a-z][\s\S]*>/i.test(value)) return 'html';
  if (/\.[\w-]+\s*\{|#[\w-]+\s*\{/.test(value)) return 'css';
  if (/^#!\/bin\/bash|sudo\s+|npm\s+|docker\s+/.test(value)) return 'bash';
  return '';
}

function formatBytes(count) {
  if (count < 1024) return `${count}B`;
  return `${(count / 1024).toFixed(count >= 10 * 1024 ? 0 : 1)}KB`;
}

function expiryToDate(value) {
  const durations = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  return durations[value] ? new Date(Date.now() + durations[value]).toISOString() : null;
}

export default function Home({ colors, shared }) {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('js');
  const [expiresIn, setExpiresIn] = useState('never');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [gradientOffset, setGradientOffset] = useState(0);

  const suggestion = useMemo(() => detectLanguage(code), [code]);
  const lineCount = Math.max(code.split('\n').length, 1);
  const charCount = new Blob([code]).size;

  useEffect(() => {
    const timer = window.setInterval(() => setGradientOffset((value) => (value + 1) % 200), 80);
    return () => window.clearInterval(timer);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    pushToast('Creating your snippet...', 'info');

    try {
      const snippet = await createSnippet({
        title,
        language,
        code,
        expires_at: expiryToDate(expiresIn),
        password: passwordEnabled ? password : '',
        burn_after_read: burnAfterRead
      });
      pushToast('Snippet created successfully.', 'success');
      navigate(`/s/${snippet.id}`);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const lineNumbers = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gap: 12, padding: '18px 0 6px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(42px, 7vw, 76px)',
            lineHeight: 0.98,
            letterSpacing: 0,
            background: `linear-gradient(90deg, #F8FAFC, #A5B4FC, #10B981, #F8FAFC) ${gradientOffset}% 50% / 220% auto`,
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            transition: 'background-position 80ms linear'
          }}
        >
          Share Code. Instantly.
        </h1>
        <p style={{ color: colors.muted, maxWidth: 720, lineHeight: 1.7, margin: 0 }}>
          Paste a snippet, choose privacy and expiry controls, then ship a clean link.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ ...shared.card, padding: 22, display: 'grid', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} style={shared.input} />
          </label>
          <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
            Language
            <select value={language} onChange={(event) => setLanguage(event.target.value)} style={shared.input}>
              {languages.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        {suggestion && suggestion !== language ? (
          <button
            type="button"
            onClick={() => {
              setLanguage(suggestion);
              pushToast(`Language switched to ${suggestion}.`, 'info');
            }}
            style={{ ...shared.button, justifySelf: 'start', background: 'rgba(99, 102, 241, 0.22)', border: `1px solid ${colors.accent}` }}
          >
            Looks like {suggestion} - switch?
          </button>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
          <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
            Expires
            <select value={expiresIn} onChange={(event) => setExpiresIn(event.target.value)} style={shared.input}>
              <option value="never">Never</option>
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, paddingTop: 27 }}>
            <input type="checkbox" checked={passwordEnabled} onChange={(event) => setPasswordEnabled(event.target.checked)} />
            Password protection
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, paddingTop: 27 }}>
            <input type="checkbox" checked={burnAfterRead} onChange={(event) => setBurnAfterRead(event.target.checked)} />
            Burn after read
          </label>
        </div>

        {passwordEnabled ? (
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={128}
            placeholder="Set snippet password"
            style={shared.input}
          />
        ) : null}

        <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
          Code
          <div style={{ display: 'grid', gridTemplateColumns: '54px minmax(0, 1fr)', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden', background: 'rgba(10, 14, 26, 0.78)' }}>
            <pre style={{ margin: 0, padding: '14px 10px', color: colors.muted, textAlign: 'right', userSelect: 'none', lineHeight: 1.55, fontSize: 14, fontFamily: 'Consolas, monospace' }}>{lineNumbers}</pre>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={handleKeyDown}
              required
              rows={18}
              maxLength={50 * 1024}
              style={{ ...shared.input, border: 0, borderRadius: 0, resize: 'vertical', minHeight: 340, fontFamily: 'Consolas, "SFMono-Regular", monospace', lineHeight: 1.55 }}
            />
          </div>
          <span style={{ display: 'flex', justifyContent: 'space-between', color: charCount > 45 * 1024 ? colors.danger : colors.muted, fontSize: 13 }}>
            <span>{formatBytes(charCount)} / 50KB</span>
            <span>Press Ctrl+Enter to share</span>
          </span>
        </label>

        <button type="submit" disabled={saving} style={{ ...shared.button, justifySelf: 'start', opacity: saving ? 0.72 : 1, cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? 'Creating your snippet...' : 'Create Snippet'}
        </button>
      </form>
    </section>
  );
}
