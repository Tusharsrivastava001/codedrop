import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getStats } from '../api.js';

export default function Stats({ colors }) {
  const [stats, setStats] = useState(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      setLoading(true);
      setError('');
      try {
        const response = await getStats();
        if (active) {
          setStats(response.data);
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
    loadStats();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p style={{ color: colors.muted }}>Loading statistics...</p>;
  }

  if (error) {
    return <div style={{ color: '#fecaca', background: '#3b1721', border: '1px solid #7f1d1d', borderRadius: 8, padding: 14 }}>{error}</div>;
  }

  const cards = [
    ['Total snippets', stats.total_snippets],
    ['Total views', stats.total_views],
    ['Snippets today', stats.snippets_today],
    ['Cache hit rate', stats.cache_hit_rate]
  ];

  return (
    <section style={{ display: 'grid', gap: 22 }}>
      <div>
        <p style={{ color: colors.accent, fontWeight: 800, margin: '0 0 8px' }}>served from: {source}</p>
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.12, letterSpacing: 0 }}>Snippet statistics</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {cards.map(([label, value]) => (
          <div key={label} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 18 }}>
            <p style={{ margin: '0 0 8px', color: colors.muted, fontWeight: 700 }}>{label}</p>
            <strong style={{ fontSize: 30 }}>{value}</strong>
          </div>
        ))}
      </div>

      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 18, height: 340 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 20, letterSpacing: 0 }}>Top languages</h2>
        <ResponsiveContainer width="100%" height="82%">
          <BarChart data={stats.top_languages}>
            <CartesianGrid stroke={colors.border} vertical={false} />
            <XAxis dataKey="language" stroke={colors.muted} />
            <YAxis stroke={colors.muted} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#141824', border: `1px solid ${colors.border}`, color: colors.text }} />
            <Bar dataKey="count" fill={colors.accent} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 18, overflowX: 'auto' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 20, letterSpacing: 0 }}>Most viewed</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: colors.text }}>
          <thead>
            <tr style={{ color: colors.muted, textAlign: 'left' }}>
              <th style={{ padding: '10px 8px', borderBottom: `1px solid ${colors.border}` }}>Title</th>
              <th style={{ padding: '10px 8px', borderBottom: `1px solid ${colors.border}` }}>ID</th>
              <th style={{ padding: '10px 8px', borderBottom: `1px solid ${colors.border}` }}>Views</th>
            </tr>
          </thead>
          <tbody>
            {stats.most_viewed.map((snippet) => (
              <tr key={snippet.id}>
                <td style={{ padding: '12px 8px', borderBottom: `1px solid ${colors.border}` }}>
                  <Link to={`/s/${snippet.id}`} style={{ color: colors.text, fontWeight: 800 }}>
                    {snippet.title}
                  </Link>
                </td>
                <td style={{ padding: '12px 8px', borderBottom: `1px solid ${colors.border}`, color: colors.muted }}>{snippet.id}</td>
                <td style={{ padding: '12px 8px', borderBottom: `1px solid ${colors.border}` }}>{snippet.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
