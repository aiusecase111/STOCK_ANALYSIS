import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import KpiCard from '../components/ui/KpiCard';
import StockTable from '../components/StockTable';
import Spinner from '../components/ui/Spinner';
import { fetchSector, fetchStocks } from '../api/client';
import type { SectorSummary, PaginatedStocks } from '../types';
import { Layers, CheckSquare, Clock, Target } from 'lucide-react';

export default function SectorDashboard() {
  const { id } = useParams<{ id: string }>();
  const sectorId = Number(id);

  const [sector, setSector] = useState<SectorSummary | null>(null);
  const [data, setData] = useState<PaginatedStocks | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('symbol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('');

  useEffect(() => {
    fetchSector(sectorId).then(setSector);
  }, [sectorId]);

  const load = useCallback(async () => {
    setTableLoading(true);
    const params: any = { page, page_size: pageSize, sector_id: sectorId, sort_by: sortBy, sort_dir: sortDir };
    if (search) params.search = search;
    if (statusFilter !== '') params.is_analyzed = statusFilter === 'true';
    const d = await fetchStocks(params);
    setData(d);
    setTableLoading(false);
    setLoading(false);
  }, [page, pageSize, sectorId, search, sortBy, sortDir, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (s: string) => { setSearch(s); setPage(1); };
  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
    setPage(1);
  };
  const handleStatus = (s: '' | 'true' | 'false') => { setStatusFilter(s); setPage(1); };

  const title = sector ? sector.name : 'Sector Dashboard';

  return (
    <Layout title={title} subtitle={sector ? `${sector.total_stocks} stocks · ${sector.completion_pct.toFixed(1)}% analyzed` : undefined}>
      {loading && !sector ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : (
        <>
          {sector && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
              <KpiCard label="Total Stocks" value={sector.total_stocks} icon={<Layers size={16} />} />
              <KpiCard label="Analyzed" value={sector.analyzed_stocks} icon={<CheckSquare size={16} />} accent="var(--green)" />
              <KpiCard label="Pending" value={sector.pending_stocks} icon={<Clock size={16} />} accent="var(--orange)" />
              <KpiCard label="Completion" value={`${sector.completion_pct.toFixed(1)}%`} icon={<Target size={16} />} accent="var(--purple)" />
            </div>
          )}

          {/* Progress Bar */}
          {sector && (
            <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span>Analysis Progress</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{sector.completion_pct.toFixed(1)}%</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${sector.completion_pct}%` }} />
              </div>
            </div>
          )}

          <StockTable
            data={data}
            loading={tableLoading}
            page={page}
            pageSize={pageSize}
            search={search}
            sortBy={sortBy}
            sortDir={sortDir}
            statusFilter={statusFilter}
            onPage={setPage}
            onPageSize={s => { setPageSize(s); setPage(1); }}
            onSearch={handleSearch}
            onSort={handleSort}
            onStatus={handleStatus}
          />
        </>
      )}
    </Layout>
  );
}
