import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import StockTable from '../components/StockTable';
import KpiCard from '../components/ui/KpiCard';
import { fetchPendingStocks, fetchSectors } from '../api/client';
import type { PaginatedStocks, SectorSummary } from '../types';
import { Clock } from 'lucide-react';

export default function PendingStocks() {
  const [data, setData] = useState<PaginatedStocks | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [sectorFilter, setSectorFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchSectors().then(setSectors); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = { page, page_size: pageSize };
    if (search) params.search = search;
    if (sectorFilter !== '') params.sector_id = sectorFilter;
    const d = await fetchPendingStocks(params);
    setData(d);
    setLoading(false);
  }, [page, pageSize, search, sectorFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout title="Pending Analysis" subtitle="Stocks awaiting your research">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Pending Stocks" value={data?.total ?? '—'} icon={<Clock size={16} />} accent="var(--orange)" />
      </div>

      <div style={{ marginBottom: 14 }}>
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
        sortBy="symbol"
        sortDir="asc"
        statusFilter="false"
        onPage={setPage}
        onPageSize={s => { setPageSize(s); setPage(1); }}
        onSearch={s => { setSearch(s); setPage(1); }}
        onSort={() => {}}
        onStatus={() => {}}
        showSector
      />
    </Layout>
  );
}
