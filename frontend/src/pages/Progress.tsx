import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import KpiCard from '../components/ui/KpiCard';
import Spinner from '../components/ui/Spinner';
import { fetchDashboard, fetchHistory } from '../api/client';
import type { DashboardSummary, AnalysisHistoryItem } from '../types';
import { BarChart2, CheckSquare, Clock, Target, Activity } from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

export default function Progress() {
  const [dash, setDash] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchHistory(50)]).then(([d, h]) => {
      setDash(d); setHistory(h);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout title="Research Progress">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={32} /></div>
    </Layout>
  );

  const barData = dash?.sectors.map(s => ({
    name: s.name.length > 18 ? s.name.slice(0, 16) + '…' : s.name,
    Analyzed: s.analyzed_stocks,
    Pending: s.pending_stocks,
    '% Done': s.completion_pct,
  })) || [];

  return (
    <Layout title="Research Progress" subtitle="Track your analysis journey across all sectors">
      {dash && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <KpiCard label="Total Sectors" value={dash.total_sectors} icon={<BarChart2 size={16} />} accent="var(--blue)" />
            <KpiCard label="Total Stocks" value={dash.total_stocks} icon={<Activity size={16} />} />
            <KpiCard label="Analyzed" value={dash.analyzed_stocks} icon={<CheckSquare size={16} />} accent="var(--green)" />
            <KpiCard label="Pending" value={dash.pending_stocks} icon={<Clock size={16} />} accent="var(--orange)" />
            <KpiCard label="Overall Progress" value={`${dash.completion_pct.toFixed(1)}%`} icon={<Target size={16} />} accent="var(--purple)" sub={`${dash.analyzed_stocks} / ${dash.total_stocks}`} />
          </div>

          {/* Overall progress bar */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Overall Analysis Completion</span>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>{dash.completion_pct.toFixed(1)}%</span>
            </div>
            <div className="progress-bar" style={{ height: 10 }}>
              <div className="progress-fill" style={{ width: `${dash.completion_pct}%` }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {dash.analyzed_stocks} analyzed · {dash.pending_stocks} remaining
            </div>
          </div>

          {/* Sector Progress Chart */}
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Sector-wise Progress
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(barData.length * 38 + 50, 200)}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid horizontal={false} stroke="var(--border-subtle)" />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={155} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.8rem' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="Analyzed" fill="var(--green)" radius={[0, 3, 3, 0]} stackId="a" />
                <Bar dataKey="Pending" fill="#30363d" radius={[0, 3, 3, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sector Table */}
          <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sector Breakdown</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Total</th>
                  <th>Analyzed</th>
                  <th>Pending</th>
                  <th>Completion</th>
                  <th style={{ width: 180 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {dash.sectors.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{s.total_stocks}</td>
                    <td style={{ color: 'var(--green)' }}>{s.analyzed_stocks}</td>
                    <td style={{ color: 'var(--orange)' }}>{s.pending_stocks}</td>
                    <td style={{ fontWeight: 600 }}>{s.completion_pct.toFixed(1)}%</td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${s.completion_pct}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Activity Log */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={15} color="var(--blue)" />
          <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Recent Activity</h3>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No activity yet. Start analyzing stocks!
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Stock</th>
                <th>Sector</th>
                <th>Action</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: 600 }}>{h.stock_symbol}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{h.sector_name}</td>
                  <td>
                    <span className={h.new_status ? 'badge-green' : 'badge-orange'} style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem' }}>
                      {h.new_status ? '✓ Analyzed' : '⧖ Pending'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {format(new Date(h.changed_at), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{h.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
