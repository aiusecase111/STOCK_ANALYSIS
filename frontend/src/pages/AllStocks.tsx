import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import StockTable from '../components/StockTable';
import { fetchStocks, fetchSectors } from '../api/client';
import type { PaginatedStocks, SectorSummary } from '../types';

export default function AllStocks() {
  const [data, setData] = useState<PaginatedStocks | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [sectorFilter, setSectorFilter] = useState<number | ''>('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('symbol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('');

  useEffect(() => { fetchSectors().then(setSectors); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = { page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir };
    if (search) params.search = search;
    if (sectorFilter !== '') params.sector_id = sectorFilter;
    if (statusFilter !== '') params.is_analyzed = statusFilter === 'true';
    const d = await fetchStocks(params);
    setData(d);
    setLoading(false);
  }, [page, pageSize, search, sortBy, sortDir, sectorFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout title="All Stocks" subtitle="Browse and filter every stock across all sectors">
      {/* Sector Filter */}
      <div style={{ marginBottom: 16 }}>
        <select value={sectorFilter} onChange={e => { setSectorFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }} style={{ width: 220 }}>
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
        sortBy={sortBy}
        sortDir={sortDir}
        statusFilter={statusFilter}
        onPage={setPage}
        onPageSize={s => { setPageSize(s); setPage(1); }}
        onSearch={s => { setSearch(s); setPage(1); }}
        onSort={col => {
          if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
          else { setSortBy(col); setSortDir('desc'); }
          setPage(1);
        }}
        onStatus={s => { setStatusFilter(s); setPage(1); }}
        showSector
      />
    </Layout>
  );
}
