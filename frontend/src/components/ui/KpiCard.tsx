import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  accent?: string;
}

export default function KpiCard({ label, value, sub, icon, accent }: Props) {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          {label}
        </span>
        {icon && (
          <span style={{ color: accent || 'var(--text-muted)', opacity: 0.8 }}>{icon}</span>
        )}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: accent || 'var(--text-primary)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}
