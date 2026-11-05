from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime


# ── Sector ────────────────────────────────────────────────────────────────────
class SectorBase(BaseModel):
    name: str

class SectorCreate(SectorBase):
    pass

class SectorSummary(BaseModel):
    id: int
    name: str
    total_stocks: int
    analyzed_stocks: int
    pending_stocks: int
    completion_pct: float

    class Config:
        from_attributes = True


# ── Shareholding ──────────────────────────────────────────────────────────────
class ShareholdingPoint(BaseModel):
    quarter: str
    dii_percent: Optional[float] = None
    fii_percent: Optional[float] = None

    class Config:
        from_attributes = True


# ── Stock Metric ──────────────────────────────────────────────────────────────
class StockMetricSchema(BaseModel):
    return_1m: Optional[float] = None
    return_6m: Optional[float] = None
    return_1y: Optional[float] = None
    return_3y: Optional[float] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    extra_metrics: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# ── Analysis Status ───────────────────────────────────────────────────────────
class AnalysisStatusSchema(BaseModel):
    is_analyzed: bool
    analyzed_at: Optional[datetime] = None
    notes: Optional[str] = None
    quality_status: Optional[str] = None       # "accepted" | "rejected" | None
    desired_price: Optional[float] = None
    quality_decided_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Stock List Item ───────────────────────────────────────────────────────────
class StockListItem(BaseModel):
    id: int
    symbol: str
    company_name: Optional[str] = None
    sector_id: int
    sector_name: str
    return_1m: Optional[float] = None
    return_6m: Optional[float] = None
    return_1y: Optional[float] = None
    return_3y: Optional[float] = None
    is_analyzed: bool
    analyzed_at: Optional[datetime] = None
    quality_status: Optional[str] = None
    desired_price: Optional[float] = None

    class Config:
        from_attributes = True


# ── Stock Detail ──────────────────────────────────────────────────────────────
class StockDetail(BaseModel):
    id: int
    symbol: str
    company_name: Optional[str] = None
    sector_id: int
    sector_name: str
    source_file: Optional[str] = None
    created_at: Optional[datetime] = None
    metrics: Optional[StockMetricSchema] = None
    shareholding: List[ShareholdingPoint] = []
    analysis: Optional[AnalysisStatusSchema] = None

    class Config:
        from_attributes = True


# ── Analysis History ──────────────────────────────────────────────────────────
class AnalysisHistoryItem(BaseModel):
    id: int
    stock_id: int
    stock_symbol: str
    sector_name: str
    previous_status: bool
    new_status: bool
    changed_at: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ── Pagination ────────────────────────────────────────────────────────────────
class PaginatedStocks(BaseModel):
    items: List[StockListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Import ────────────────────────────────────────────────────────────────────
class ImportResult(BaseModel):
    file_name: str
    sector_name: str
    total_rows_detected: int
    successfully_imported: int
    duplicates_skipped: int
    failed_rows: int
    failed_details: List[str]
    detected_columns: List[str]


# ── Dashboard Summary ─────────────────────────────────────────────────────────
class DashboardSummary(BaseModel):
    total_sectors: int
    total_stocks: int
    analyzed_stocks: int
    pending_stocks: int
    completion_pct: float
    sectors: List[SectorSummary]


# ── Mark Analyzed (generic) ───────────────────────────────────────────────────
class MarkAnalyzedRequest(BaseModel):
    notes: Optional[str] = None


# ── Accept / Reject requests ──────────────────────────────────────────────────
class AcceptStockRequest(BaseModel):
    desired_price: float
    notes: Optional[str] = None

class RejectStockRequest(BaseModel):
    notes: Optional[str] = None


# ── Quality Stock (accepted) ──────────────────────────────────────────────────
class QualityStockItem(BaseModel):
    id: int                        # stock id
    symbol: str
    company_name: Optional[str] = None
    sector_name: str
    desired_price: float
    quality_decided_at: Optional[datetime] = None
    return_1m: Optional[float] = None
    return_1y: Optional[float] = None
    current_price: Optional[float] = None   # from extra_metrics

    class Config:
        from_attributes = True


class QualityDashboard(BaseModel):
    total_accepted: int
    total_rejected: int
    sector_breakdown: List[Dict[str, Any]]  # [{sector, count, stocks:[]}]
    stocks: List[QualityStockItem]


# ── Global Search ─────────────────────────────────────────────────────────────
class SearchResult(BaseModel):
    id: int
    symbol: str
    company_name: Optional[str] = None
    sector_id: int
    sector_name: str
    is_analyzed: bool
    quality_status: Optional[str] = None
