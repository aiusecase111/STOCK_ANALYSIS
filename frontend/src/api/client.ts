import axios from 'axios';
import type {
  DashboardSummary, SectorSummary, PaginatedStocks,
  StockDetail, AnalysisStatus, AnalysisHistoryItem,
  ImportResult, SearchResult, QualityDashboard,
} from '../types';

const api = axios.create({
  // In production (Railway), VITE_API_URL is set to the backend service URL.
  // Locally, it's unset so requests go to /api which Vite proxies to :8000.
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

// ── Sectors ────────────────────────────────────────────────────────────────
export const fetchDashboard = () =>
  api.get<DashboardSummary>('/sectors/dashboard').then(r => r.data);

export const fetchSectors = () =>
  api.get<SectorSummary[]>('/sectors').then(r => r.data);

export const fetchSector = (id: number) =>
  api.get<SectorSummary>(`/sectors/${id}`).then(r => r.data);

// ── Stocks ─────────────────────────────────────────────────────────────────
export interface StockListParams {
  page?: number;
  page_size?: number;
  sector_id?: number;
  is_analyzed?: boolean;
  search?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export const fetchStocks = (params: StockListParams = {}) =>
  api.get<PaginatedStocks>('/stocks', { params }).then(r => r.data);

export const fetchStock = (id: number) =>
  api.get<StockDetail>(`/stocks/${id}`).then(r => r.data);

export const searchStocks = (q: string, limit = 10) =>
  api.get<SearchResult[]>('/stocks/search', { params: { q, limit } }).then(r => r.data);

// ── Analysis — core ────────────────────────────────────────────────────────
export const markAnalyzed = (stockId: number, notes?: string) =>
  api.post<AnalysisStatus>(`/analysis/stocks/${stockId}/analyze`, { notes }).then(r => r.data);

export const unmarkAnalyzed = (stockId: number) =>
  api.post<AnalysisStatus>(`/analysis/stocks/${stockId}/unmark`).then(r => r.data);

// ── Analysis — Accept / Reject ─────────────────────────────────────────────
export const acceptStock = (stockId: number, desiredPrice: number, notes?: string) =>
  api.post<AnalysisStatus>(`/analysis/stocks/${stockId}/accept`, {
    desired_price: desiredPrice,
    notes,
  }).then(r => r.data);

export const rejectStock = (stockId: number, notes?: string) =>
  api.post<AnalysisStatus>(`/analysis/stocks/${stockId}/reject`, { notes }).then(r => r.data);

// ── Analysis — lists ───────────────────────────────────────────────────────
export const fetchAnalyzedStocks = (params: StockListParams = {}) =>
  api.get<PaginatedStocks>('/analysis/analyzed', { params }).then(r => r.data);

export const fetchPendingStocks = (params: StockListParams = {}) =>
  api.get<PaginatedStocks>('/analysis/pending', { params }).then(r => r.data);

export const fetchHistory = (limit = 50) =>
  api.get<AnalysisHistoryItem[]>('/analysis/history', { params: { limit } }).then(r => r.data);

// ── Quality Stocks ─────────────────────────────────────────────────────────
export const fetchQualityDashboard = () =>
  api.get<QualityDashboard>('/analysis/quality').then(r => r.data);

/** Returns the download URL — call window.open(url) or an <a> link */
export const qualityDownloadUrl = () => '/api/analysis/quality/download';

// ── Import ─────────────────────────────────────────────────────────────────
export const importAuto = (file: File, sectorName: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('sector_name', sectorName);
  return api.post<ImportResult>('/import/auto', form).then(r => r.data);
};
