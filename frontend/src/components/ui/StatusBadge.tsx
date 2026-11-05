import { CheckCircle, Clock } from 'lucide-react';

interface Props { analyzed: boolean; small?: boolean; }

export default function StatusBadge({ analyzed, small }: Props) {
  const cls = analyzed ? 'badge-green' : 'badge-orange';
  const Icon = analyzed ? CheckCircle : Clock;
  const label = analyzed ? 'Analyzed' : 'Pending';
  const sz = small ? 11 : 12;
  return (
    <span className={cls} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 20, fontSize: small ? '0.72rem' : '0.78rem', fontWeight: 500,
    }}>
      <Icon size={sz} /> {label}
    </span>
  );
}
