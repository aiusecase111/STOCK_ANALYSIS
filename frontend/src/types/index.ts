export interface SectorSummary {
  id: number;
  name: string;
  total_stocks: number;
  analyzed_stocks: number;
  pending_stocks: number;
  completion_pct: number;
}

export interface DashboardSummary {
  total_sectors: number;
  total_stocks: number;
  analyzed_stocks: number;
  pending_stocks: number;
  completion_pct: number;
  sectors: SectorSummary[];
}

export interface ShareholdingPoint {
  quarter: string;
  dii_percent: number | null;
  fii_percent: number | null;
}

export interface StockMetric {
  return_1m: number | null;
  return_6m: number | null;
  return_1y: number | null;
  return_3y: number | null;
  pros: string | null;
  cons: string | null;
  extra_metrics: Record<string, string | number> | null;
}

export interface AnalysisStatus {
  is_analyzed: boolean;
  analyzed_at: string | null;
  notes: string | null;
  // Quality fields
  quality_status: 'accepted' | 'rejected' | null;
  desired_price: number | null;
  quality_decided_at: string | null;
}

export interface StockListItem {
  id: number;
  symbol: string;
  company_name: string | null;
  sector_id: number;
  sector_name: string;
  return_1m: number | null;
  return_6m: number | null;
  return_1y: number | null;
  return_3y: number | null;
  is_analyzed: boolean;
  analyzed_at: string | null;
  quality_status: 'accepted' | 'rejected' | null;
  desired_price: number | null;
}

export interface StockDetail {
  id: number;
  symbol: string;
  company_name: string | null;
  sector_id: number;
  sector_name: string;
  source_file: string | null;
  created_at: string | null;
  metrics: StockMetric | null;
  shareholding: ShareholdingPoint[];
  analysis: AnalysisStatus | null;
}

export interface PaginatedStocks {
  items: StockListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AnalysisHistoryItem {
  id: number;
  stock_id: number;
  stock_symbol: string;
  sector_name: string;
  previous_status: boolean;
  new_status: boolean;
  changed_at: string;
  notes: string | null;
}

export interface ImportResult {
  file_name: string;
  sector_name: string;
  total_rows_detected: number;
  successfully_imported: number;
  duplicates_skipped: number;
  failed_rows: number;
  failed_details: string[];
  detected_columns: string[];
}

export interface SearchResult {
  id: number;
  symbol: string;
  company_name: string | null;
  sector_id: number;
  sector_name: string;
  is_analyzed: boolean;
  quality_status: 'accepted' | 'rejected' | null;
}

// ── Quality / Watchlist ────────────────────────────────────────────────────
export interface QualityStockItem {
  id: number;
  symbol: string;
  company_name: string | null;
  sector_name: string;
  desired_price: number;
  quality_decided_at: string | null;
  return_1m: number | null;
  return_1y: number | null;
  current_price: number | null;
}

export interface SectorBreakdownItem {
  sector: string;
  count: number;
  stocks: string[];
}

export interface QualityDashboard {
  total_accepted: number;
  total_rejected: number;
  sector_breakdown: SectorBreakdownItem[];
  stocks: QualityStockItem[];
}
