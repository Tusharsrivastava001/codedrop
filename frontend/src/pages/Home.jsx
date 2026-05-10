import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSnippet } from '../api.js';

const languages = ['js', 'ts', 'python', 'java', 'go', 'rust', 'bash', 'sql', 'json', 'html', 'css', 'plaintext'];

export default function Home({ colors }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('js');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const snippet = await createSnippet({ title, language, code });
      navigate(`/s/${snippet.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${colors.border}`,
    background: '#141824',
    color: colors.text,
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none'
  };

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <div>
        <p style={{ color: colors.accent, fontWeight: 800, margin: '0 0 8px' }}>Share code fast</p>
        <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.08, letterSpacing: 0 }}>Create a CodeDrop snippet</h1>
        <p style={{ color: colors.muted, maxWidth: 680, lineHeight: 1.7, margin: '14px 0 0' }}>
          Paste code, choose a language, and get a link you can send anywhere.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gap: 18,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: 22,
          boxShadow: '0 16px 48px rgba(0,0,0,0.28)'
        }}
      >
        <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={255}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
          Language
          <select value={language} onChange={(event) => setLanguage(event.target.value)} style={inputStyle}>
            {languages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
          Code
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            rows={18}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: 340,
              fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
              lineHeight: 1.55
            }}
          />
        </label>

        {error ? (
          <div style={{ color: '#fecaca', background: '#3b1721', border: '1px solid #7f1d1d', borderRadius: 8, padding: 12 }}>
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          style={{
            justifySelf: 'start',
            background: saving ? '#5b21b6' : colors.accent,
            color: '#ffffff',
            border: 0,
            borderRadius: 8,
            padding: '12px 18px',
            fontWeight: 800,
            fontSize: 15,
            cursor: saving ? 'wait' : 'pointer'
          }}
        >
          {saving ? 'Creating...' : 'Create snippet'}
        </button>
      </form>
    </section>
  );
}
