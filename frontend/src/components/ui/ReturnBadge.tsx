import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  value: number | null | undefined;
  suffix?: string;
}

export default function ReturnBadge({ value, suffix = '%' }: Props) {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
  const isPos = value > 0;
  const isNeg = value < 0;
  const color = isPos ? 'var(--green)' : isNeg ? 'var(--red)' : 'var(--text-secondary)';
  const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
  return (
    <span style={{ color, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.85rem', fontWeight: 500 }}>
      <Icon size={12} />
      {isPos ? '+' : ''}{value.toFixed(2)}{suffix}
    </span>
  );
}
