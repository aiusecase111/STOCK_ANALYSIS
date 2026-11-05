import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  Star, Download, ExternalLink, Search,
  TrendingUp, XCircle, Layers, IndianRupee, RefreshCw,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Spinner from '../components/ui/Spinner';
import ReturnBadge from '../components/ui/ReturnBadge';
import { fetchQualityDashboard, qualityDownloadUrl } from '../api/client';
import type { QualityDashboard, QualityStockItem } from '../types';

const COLORS = ['#388bfd', '#a371f7', '#3fb950', '#e3b341', '#f85149', '#58a6ff', '#bc8cff', '#ffa657'];

// ── Tooltip for recharts ─────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? 'var(--text-primary)' }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

// ── Price-vs-Current indicator ───────────────────────────────────────────────
function PriceStatus({ current, desired }: { current: number | null; desired: number }) {
  if (current == null) return <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>;
  const diff   = ((current - desired) / desired) * 100;
  const below  = current <= desired;
  return (
    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: below ? 'var(--green)' : 'var(--orange)' }}>
      {below ? '✓ Below' : '↑ Above'} &nbsp;{Math.abs(diff).toFixed(1)}%
    </span>
  );
}

export default function QualityStocksPage() {
  const nav = useNavigate();
  const [data, setData]         = useState<QualityDashboard | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [sectorFilter, setSector] = useState('');
  const [downloading, setDownloading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchQualityDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = qualityDownloadUrl();
      const a   = document.createElement('a');
      a.href    = url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  // ── filtered stock list ───────────────────────────────────────────────────
  const filteredStocks: QualityStockItem[] = (data?.stocks ?? []).filter(s => {
    const matchSearch = !search ||
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (s.company_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchSector = !sectorFilter || s.sector_name === sectorFilter;
    return matchSearch && matchSector;
  });

  const sectors = Array.from(new Set((data?.stocks ?? []).map(s => s.sector_name))).sort();

  // ── chart data ────────────────────────────────────────────────────────────
  const pieData = (data?.sector_breakdown ?? []).map((s, i) => ({
    name: s.sector, value: s.count, fill: COLORS[i % COLORS.length],
  }));

  const barData = (data?.sector_breakdown ?? []).map(s => ({
    name: s.sector.length > 18 ? s.sector.slice(0, 16) + '…' : s.sector,
    Stocks: s.count,
  }));

  if (loading) return (
    <Layout title="Quality Watchlist" subtitle="Accepted stocks with desired buy prices">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={32} /></div>
    </Layout>
  );

  return (
    <Layout title="Quality Watchlist" subtitle="Stocks you accepted as quality — with your desired buy prices">

      {/* ── Top action bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Download Excel */}
          <button
            className="btn btn-success"
            onClick={handleDownload}
            disabled={downloading || !data?.total_accepted}
            title="Download as Excel"
          >
            {downloading
              ? <><Spinner size={14} /> Preparing…</>
              : <><Download size={14} /> Download Excel</>
            }
          </button>

          {/* Refresh */}
          <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>

        {data && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {data.total_accepted} accepted · {data.total_rejected} rejected
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Quality Stocks</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={18} fill="currentColor" /> {data?.total_accepted ?? 0}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Rejected</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <XCircle size={18} /> {data?.total_rejected ?? 0}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Sectors Covered</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={18} /> {data?.sector_breakdown.length ?? 0}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Below Target</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <IndianRupee size={18} />
            {(data?.stocks ?? []).filter(s => s.current_price != null && s.current_price <= s.desired_price).length}
          </div>
        </div>
      </div>

      {/* ── Charts row (only if data exists) ── */}
      {(data?.total_accepted ?? 0) > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>

          {/* Donut — sector distribution */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Sector Distribution
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {pieData.map((d, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, display: 'inline-block' }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>

          {/* Bar — stocks per sector */}
          {barData.length > 1 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Stocks per Sector
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border-subtle)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Stocks" fill="var(--green)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Sector summary cards ── */}
      {(data?.sector_breakdown.length ?? 0) > 0 && (
        <>
          <h2 style={{ margin: '0 0 12px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            By Sector
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 24 }}>
            {data!.sector_breakdown.map((s, i) => (
              <div
                key={s.sector}
                className="card card-hover"
                style={{ padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => setSector(sectorFilter === s.sector ? '' : s.sector)}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.sector}</span>
                  <span style={{
                    background: `${COLORS[i % COLORS.length]}22`,
                    color: COLORS[i % COLORS.length],
                    borderRadius: 6, padding: '2px 8px',
                    fontSize: '0.78rem', fontWeight: 700,
                  }}>{s.count}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {s.stocks.slice(0, 4).join(', ')}{s.stocks.length > 4 ? ` +${s.stocks.length - 4} more` : ''}
                </div>
                {sectorFilter === s.sector && (
                  <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--blue)', fontWeight: 600 }}>
                    ✓ Filtering by this sector
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Stocks table ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
          Quality Stocks
          {sectorFilter && <span style={{ color: 'var(--blue)', marginLeft: 6 }}>· {sectorFilter}</span>}
        </h2>
        {sectorFilter && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSector('')}>
            Clear filter
          </button>
        )}
        <div style={{ position: 'relative', width: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search symbol…" style={{ paddingLeft: 30 }} />
        </div>
        <select value={sectorFilter} onChange={e => setSector(e.target.value)} style={{ width: 180 }}>
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filteredStocks.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <Star size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            {(data?.total_accepted ?? 0) === 0
              ? 'No quality stocks yet'
              : 'No stocks match your filter'
            }
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {(data?.total_accepted ?? 0) === 0
              ? 'Open any stock, click "Mark as Analyzed", then choose Accept.'
              : 'Try clearing your search or sector filter.'
            }
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Symbol</th>
                <th>Sector</th>
                <th>Desired Price</th>
                <th>Current Price</th>
                <th>Status</th>
                <th>1M Return</th>
                <th>1Y Return</th>
                <th>Added On</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((s, idx) => (
                <tr
                  key={s.id}
                  onClick={() => nav(`/stocks/${s.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={12} color="var(--green)" fill="var(--green)" />
                      <span style={{ fontWeight: 700 }}>{s.symbol}</span>
                    </div>
                    {s.company_name && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.company_name}</div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{s.sector_name}</td>

                  {/* Desired price */}
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.92rem' }}>
                      ₹{s.desired_price.toFixed(2)}
                    </span>
                  </td>

                  {/* Current price */}
                  <td>
                    {s.current_price != null
                      ? <span style={{ fontWeight: 500 }}>₹{s.current_price.toFixed(2)}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>

                  {/* Price vs target */}
                  <td><PriceStatus current={s.current_price} desired={s.desired_price} /></td>

                  <td><ReturnBadge value={s.return_1m} /></td>
                  <td><ReturnBadge value={s.return_1y} /></td>

                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {s.quality_decided_at
                      ? new Date(s.quality_decided_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'
                    }
                  </td>

                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); nav(`/stocks/${s.id}`); }}
                      style={{ padding: '3px 8px' }}
                      title="Open stock detail"
                    >
                      <ExternalLink size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table footer */}
          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '0.78rem', color: 'var(--text-muted)',
          }}>
            <span>Showing {filteredStocks.length} of {data?.total_accepted ?? 0} quality stocks</span>
            <button className="btn btn-success btn-sm" onClick={handleDownload} disabled={downloading}>
              <Download size={12} />
              {downloading ? 'Preparing…' : 'Download Excel'}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
