import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { Layers, TrendingUp, CheckSquare, Clock, Target } from 'lucide-react';
import Layout from '../components/layout/Layout';
import KpiCard from '../components/ui/KpiCard';
import Spinner from '../components/ui/Spinner';
import { fetchDashboard } from '../api/client';
import type { DashboardSummary } from '../types';

const COLORS = ['#1a6fd4', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#9333ea'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: '0.8rem',
      boxShadow: 'var(--shadow-lg)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.fill ?? p.color, fontWeight: 500, marginBottom: 2 }}>
          {p.name}: <span style={{ color: 'var(--text-primary)' }}>{p.value}</span>
          {p.dataKey === 'completion_pct' ? '%' : ''}
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    fetchDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Overview" subtitle="Stock research portfolio summary">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Spinner size={32} />
      </div>
    </Layout>
  );

  if (!data) return <Layout title="Overview"><div>Failed to load data.</div></Layout>;

  const pieData = data.sectors.map((s, i) => ({
    name: s.name, value: s.total_stocks, fill: COLORS[i % COLORS.length],
  }));

  const progressData = data.sectors.map(s => ({
    name: s.name.length > 20 ? s.name.substring(0, 18) + '…' : s.name,
    analyzed: s.analyzed_stocks,
    pending: s.pending_stocks,
    completion_pct: s.completion_pct,
  }));

  const analyzedPie = [
    { name: 'Analyzed', value: data.analyzed_stocks, fill: 'var(--green)' },
    { name: 'Pending', value: data.pending_stocks, fill: '#30363d' },
  ];

  return (
    <Layout title="Overview" subtitle="Your entire stock research portfolio at a glance">
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total Sectors" value={data.total_sectors} icon={<Layers size={18} />} accent="var(--blue)" />
        <KpiCard label="Total Stocks" value={data.total_stocks.toLocaleString()} icon={<TrendingUp size={18} />} />
        <KpiCard label="Analyzed" value={data.analyzed_stocks.toLocaleString()} icon={<CheckSquare size={18} />} accent="var(--green)" />
        <KpiCard label="Pending" value={data.pending_stocks.toLocaleString()} icon={<Clock size={18} />} accent="var(--orange)" />
        <KpiCard
          label="Completion"
          value={`${data.completion_pct.toFixed(1)}%`}
          icon={<Target size={18} />}
          accent="var(--purple)"
          sub={`${data.analyzed_stocks} of ${data.total_stocks}`}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Distribution Donut */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Sector Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Analyzed vs Pending Donut */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Analysis Progress
          </h3>
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--green)' }}>{data.completion_pct.toFixed(1)}%</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>complete</div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={analyzedPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                {analyzedPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sector Bar Chart */}
      {progressData.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Sector-wise Analysis Progress
          </h3>
          <ResponsiveContainer width="100%" height={progressData.length * 44 + 40}>
            <BarChart data={progressData} layout="vertical" margin={{ left: 20, right: 20 }} barCategoryGap="20%">
              <CartesianGrid horizontal={false} stroke="var(--border-subtle)" />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
              <Bar dataKey="analyzed" name="Analyzed" radius={[0, 3, 3, 0]} stackId="a" isAnimationActive={true}
                activeBar={{ stroke: 'rgba(0,0,0,0.3)', strokeWidth: 2, filter: 'brightness(0.72)' }}>
                {progressData.map((_: any, index: number) => (
                  <Cell
                    key={`analyzed-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
              <Bar dataKey="pending" name="Pending" radius={[0, 3, 3, 0]} stackId="a" isAnimationActive={true}
                activeBar={{ stroke: 'rgba(0,0,0,0.3)', strokeWidth: 2, filter: 'brightness(0.72)' }}>
                {progressData.map((_: any, index: number) => (
                  <Cell
                    key={`pending-${index}`}
                    fill={`${COLORS[index % COLORS.length]}88`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sector Cards Grid */}
      <h2 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Sectors
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {data.sectors.map((s, i) => (
          <div
            key={s.id}
            className="card card-hover"
            style={{ padding: '16px 18px', cursor: 'pointer' }}
            onClick={() => nav(`/sectors/${s.id}`)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 3 }}>{s.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.total_stocks} stocks</div>
              </div>
              <span style={{
                background: `${COLORS[i % COLORS.length]}22`,
                color: COLORS[i % COLORS.length],
                borderRadius: 6, padding: '3px 8px', fontSize: '0.78rem', fontWeight: 600,
              }}>
                {s.completion_pct.toFixed(0)}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${s.completion_pct}%`, background: COLORS[i % COLORS.length] }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--green)' }}>✓ {s.analyzed_stocks} analyzed</span>
              <span style={{ color: 'var(--orange)' }}>⧖ {s.pending_stocks} pending</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
