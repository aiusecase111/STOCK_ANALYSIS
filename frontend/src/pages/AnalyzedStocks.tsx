import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import StockTable from '../components/StockTable';
import Spinner from '../components/ui/Spinner';
import {
  fetchAnalyzedStocks, fetchSectors, fetchDashboard, fetchQualityDashboard,
} from '../api/client';
import type { PaginatedStocks, SectorSummary, DashboardSummary, QualityDashboard } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { CheckSquare, TrendingUp, TrendingDown, Clock, Star } from 'lucide-react';

const COLORS = ['#1a6fd4', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#9333ea'];

// ── Tooltip ────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', boxShadow: 'var(--shadow-lg)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey ?? p.name} style={{ color: p.fill ?? p.color, fontWeight: 500, marginBottom: 2 }}>
          {p.name}: <span style={{ color: 'var(--text-primary)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── KPI Card ───────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, sub,
}: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: `${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.72rem', color, marginTop: 2, fontWeight: 500 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AnalyzedStocks() {
  const [data, setData]           = useState<PaginatedStocks | null>(null);
  const [loading, setLoading]     = useState(true);
  const [sectors, setSectors]     = useState<SectorSummary[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [quality, setQuality]     = useState<QualityDashboard | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [sectorFilter, setSectorFilter] = useState<number | ''>('');
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch]   = useState('');

  // Load sectors + dashboard stats once
  useEffect(() => {
    Promise.all([fetchSectors(), fetchDashboard(), fetchQualityDashboard()])
      .then(([s, d, q]) => { setSectors(s); setDashboard(d); setQuality(q); })
      .finally(() => setStatsLoading(false));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (sectorFilter !== '') params.sector_id = sectorFilter;
    const d = await fetchAnalyzedStocks(params);
    setData(d);
    setLoading(false);
  }, [page, pageSize, search, sectorFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Derived chart data ───────────────────────────────────────────────────

  // Accept / Reject per sector (from quality sector_breakdown + total analyzed)
  const sectorAcceptRejectData = sectors.map((s, i) => {
    const qEntry = quality?.sector_breakdown.find(b => b.sector === s.name);
    const accepted = qEntry?.count ?? 0;
    // rejected = analyzed that are not accepted (approximation from available data)
    const rejected = Math.max(0, s.analyzed_stocks - accepted);
    const pending  = s.pending_stocks;
    return { name: s.name.replace('Information Technology', 'Info Tech').replace('Consumer Discretionary', 'Consumer Disc.'), accepted, rejected, pending, color: COLORS[i % COLORS.length] };
  });

  // Pie: overall Accept / Reject / Pending breakdown
  const totalAccepted = quality?.total_accepted ?? 0;
  const totalRejected = quality?.total_rejected ?? 0;
  const totalAnalyzed = dashboard?.analyzed_stocks ?? 0;
  const totalPending  = dashboard?.pending_stocks ?? 0;
  const totalStocks   = dashboard?.total_stocks ?? 0;
  const undecided     = Math.max(0, totalAnalyzed - totalAccepted - totalRejected);

  const overallPie = [
    { name: 'Accepted', value: totalAccepted, color: '#16a34a' },
    { name: 'Rejected', value: totalRejected, color: '#dc2626' },
    { name: 'Analyzed (no decision)', value: undecided, color: '#d97706' },
    { name: 'Pending', value: totalPending, color: '#6b7280' },
  ].filter(d => d.value > 0);

  // Completion % per sector
  const completionData = sectors.map((s, i) => ({
    name: s.name.replace('Information Technology', 'Info Tech').replace('Consumer Discretionary', 'Consumer Disc.'),
    pct: s.completion_pct,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <Layout title="Analyzed Stocks" subtitle="Analysis breakdown across all sectors">

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12, marginBottom: 24,
          }}>
            <StatCard label="Total Stocks"    value={totalStocks}   icon={<TrendingUp size={18} />}  color="#1a6fd4" />
            <StatCard label="Analyzed"        value={totalAnalyzed} icon={<CheckSquare size={18} />} color="#d97706"
              sub={`${dashboard?.completion_pct.toFixed(1)}% complete`} />
            <StatCard label="Accepted"        value={totalAccepted} icon={<Star size={18} />}        color="#16a34a" />
            <StatCard label="Rejected"        value={totalRejected} icon={<TrendingDown size={18} />} color="#dc2626" />
            <StatCard label="Pending"         value={totalPending}  icon={<Clock size={18} />}       color="#7c3aed" />
          </div>

          {/* ── Accept / Reject per sector — grouped bar ──────────────────── */}
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Accept vs Reject — by Sector
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sectorAcceptRejectData} margin={{ left: 0, right: 10 }} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="accepted" name="Accepted" radius={[4, 4, 0, 0]}
                  activeBar={{ filter: 'brightness(0.72)' }}>
                  {sectorAcceptRejectData.map((_, i) => (
                    <Cell key={i} fill="#16a34a" />
                  ))}
                </Bar>
                <Bar dataKey="rejected" name="Rejected" radius={[4, 4, 0, 0]}
                  activeBar={{ filter: 'brightness(0.72)' }}>
                  {sectorAcceptRejectData.map((_, i) => (
                    <Cell key={i} fill="#dc2626" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Sector summary table ───────────────────────────────────────── */}
          <div className="card" style={{ padding: 20, marginBottom: 24, overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Sector Summary
            </h3>
            <table>
              <thead>
                <tr>
                  {['Sector', 'Total', 'Analyzed', 'Accepted', 'Rejected', 'Pending', 'Done %'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Sector' ? 'left' : 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sectors.map((s, i) => {
                  const qEntry = quality?.sector_breakdown.find(b => b.sector === s.name);
                  const accepted = qEntry?.count ?? 0;
                  const rejected = Math.max(0, s.analyzed_stocks - accepted);
                  return (
                    <tr key={s.id}>
                      <td>
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: COLORS[i % COLORS.length], marginRight: 8,
                        }} />
                        {s.name}
                      </td>
                      <td style={{ textAlign: 'right' }}>{s.total_stocks}</td>
                      <td style={{ textAlign: 'right', color: 'var(--yellow)' }}>{s.analyzed_stocks}</td>
                      <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{accepted}</td>
                      <td style={{ textAlign: 'right', color: 'var(--red)' }}>{rejected}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{s.pending_stocks}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          background: s.completion_pct >= 75 ? 'var(--green-dim)' : s.completion_pct >= 30 ? 'var(--blue-dim)' : 'var(--border-subtle)',
                          color: s.completion_pct >= 75 ? 'var(--green)' : s.completion_pct >= 30 ? 'var(--blue)' : 'var(--text-muted)',
                          borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem', fontWeight: 600,
                        }}>
                          {s.completion_pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Stock Table ──────────────────────────────────────────────────── */}
      <h3 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Stock List
      </h3>

      <div style={{ marginBottom: 14 }}>
        <select
          value={sectorFilter}
          onChange={e => { setSectorFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
          style={{ width: 220 }}
        >
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <StockTable
        data={data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        search={search}
        sortBy="symbol"
        sortDir="asc"
        statusFilter="true"
        onPage={setPage}
        onPageSize={s => { setPageSize(s); setPage(1); }}
        onSearch={s => { setSearch(s); setPage(1); }}
        onSort={() => {}}
        onStatus={() => {}}
        showSector
      />
    </Layout>
  );
}
