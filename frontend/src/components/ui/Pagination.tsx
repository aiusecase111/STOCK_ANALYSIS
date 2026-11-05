import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  pageSize: number;
  onPageSize: (s: number) => void;
  total: number;
}

export default function Pagination({ page, totalPages, onPage, pageSize, onPageSize, total }: Props) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', flexWrap: 'wrap', gap: 10 }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Showing <b style={{ color: 'var(--text-secondary)' }}>{start}–{end}</b> of <b style={{ color: 'var(--text-secondary)' }}>{total}</b> stocks
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select
          value={pageSize}
          onChange={e => onPageSize(Number(e.target.value))}
          style={{ width: 80, padding: '4px 8px' }}
        >
          {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p = i + 1;
          if (totalPages > 7) {
            if (page <= 4) p = i + 1;
            else if (page >= totalPages - 3) p = totalPages - 6 + i;
            else p = page - 3 + i;
          }
          return (
            <button
              key={p}
              className="btn btn-ghost btn-sm"
              onClick={() => onPage(p)}
              style={p === page ? { borderColor: 'var(--blue)', color: 'var(--blue)' } : {}}
            >
              {p}
            </button>
          );
        })}
        <button className="btn btn-ghost btn-sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
