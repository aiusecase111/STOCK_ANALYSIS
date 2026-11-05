import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Spinner from '../components/ui/Spinner';
import { fetchSectors } from '../api/client';
import type { SectorSummary } from '../types';

export default function SectorList() {
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    fetchSectors().then(setSectors).finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="All Sectors" subtitle="Select a sector to explore its stocks">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {sectors.map(s => (
            <div
              key={s.id}
              className="card card-hover"
              style={{ padding: 20, cursor: 'pointer' }}
              onClick={() => nav(`/sectors/${s.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={18} color="var(--blue)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.total_stocks} stocks</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  { label: 'Total', value: s.total_stocks, color: 'var(--text-secondary)' },
                  { label: 'Analyzed', value: s.analyzed_stocks, color: 'var(--green)' },
                  { label: 'Pending', value: s.pending_stocks, color: 'var(--orange)' },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${s.completion_pct}%` }} />
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                {s.completion_pct.toFixed(1)}% complete
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
