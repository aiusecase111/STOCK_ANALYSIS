import { useNavigate } from 'react-router-dom';
import { Search, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from 'lucide-react';
import ReturnBadge from './ui/ReturnBadge';
import StatusBadge from './ui/StatusBadge';
import Pagination from './ui/Pagination';
import Spinner from './ui/Spinner';
import type { PaginatedStocks, StockListItem } from '../types';

interface Props {
  data: PaginatedStocks | null;
  loading: boolean;
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  statusFilter: '' | 'true' | 'false';
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
  onSearch: (s: string) => void;
  onSort: (col: string) => void;
  onStatus: (s: '' | 'true' | 'false') => void;
  showSector?: boolean;
}

function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: string }) {
  if (sortBy !== col) return <ArrowUpDown size={12} style={{ opacity: 0.4 }} />;
  return sortDir === 'asc' ? <ArrowUp size={12} style={{ color: 'var(--blue)' }} /> : <ArrowDown size={12} style={{ color: 'var(--blue)' }} />;
}

export default function StockTable({
  data, loading, page, pageSize, search, sortBy, sortDir, statusFilter,
  onPage, onPageSize, onSearch, onSort, onStatus, showSector = false,
}: Props) {
  const nav = useNavigate();

  const thStyle: React.CSSProperties = {
    cursor: 'pointer', userSelect: 'none',
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search symbol..."
            style={{ paddingLeft: 30 }}
          />
        </div>
        <select value={statusFilter} onChange={e => onStatus(e.target.value as any)} style={{ width: 160 }}>
          <option value="">All Stocks</option>
          <option value="false">Pending</option>
          <option value="true">Analyzed</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
        <table>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => onSort('symbol')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Symbol <SortIcon col="symbol" sortBy={sortBy} sortDir={sortDir} /></span>
              </th>
              {showSector && <th>Sector</th>}
              <th style={thStyle} onClick={() => onSort('return_1m')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>1M <SortIcon col="return_1m" sortBy={sortBy} sortDir={sortDir} /></span>
              </th>
              <th style={thStyle} onClick={() => onSort('return_6m')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>6M <SortIcon col="return_6m" sortBy={sortBy} sortDir={sortDir} /></span>
              </th>
              <th style={thStyle} onClick={() => onSort('return_1y')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>1Y <SortIcon col="return_1y" sortBy={sortBy} sortDir={sortDir} /></span>
              </th>
              <th style={thStyle} onClick={() => onSort('return_3y')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>3Y <SortIcon col="return_3y" sortBy={sortBy} sortDir={sortDir} /></span>
              </th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={showSector ? 8 : 7} style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Spinner /></div>
              </td></tr>
            )}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={showSector ? 8 : 7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No stocks found
              </td></tr>
            )}
            {!loading && data?.items.map((s: StockListItem) => (
              <tr key={s.id} onClick={() => nav(`/stocks/${s.id}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.symbol}</div>
                  {s.company_name && <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{s.company_name}</div>}
                </td>
                {showSector && <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.sector_name}</td>}
                <td><ReturnBadge value={s.return_1m} /></td>
                <td><ReturnBadge value={s.return_6m} /></td>
                <td><ReturnBadge value={s.return_1y} /></td>
                <td><ReturnBadge value={s.return_3y} /></td>
                <td><StatusBadge analyzed={s.is_analyzed} small /></td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={e => { e.stopPropagation(); nav(`/stocks/${s.id}`); }}
                    style={{ padding: '3px 8px' }}
                  >
                    <ExternalLink size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          page={page} totalPages={data.total_pages}
          onPage={onPage} pageSize={pageSize} onPageSize={onPageSize}
          total={data.total}
        />
      )}
    </div>
  );
}
