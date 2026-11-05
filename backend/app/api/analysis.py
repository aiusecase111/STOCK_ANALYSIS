import io
import math
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Stock, AnalysisStatus, AnalysisHistory, StockMetric
from app.schemas import (
    MarkAnalyzedRequest, AcceptStockRequest, RejectStockRequest,
    AnalysisStatusSchema, StockListItem,
    AnalysisHistoryItem, PaginatedStocks,
    QualityStockItem, QualityDashboard,
)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ensure_analysis(stock: Stock, db: Session) -> AnalysisStatus:
    """Get or create an AnalysisStatus row for the stock."""
    if not stock.analysis:
        analysis = AnalysisStatus(stock_id=stock.id, is_analyzed=False)
        db.add(analysis)
        db.flush()
        stock.analysis = analysis
    return stock.analysis


def _build_list_item(stock: Stock) -> StockListItem:
    metric = stock.metrics[0] if stock.metrics else None
    a = stock.analysis
    return StockListItem(
        id=stock.id,
        symbol=stock.symbol,
        company_name=stock.company_name,
        sector_id=stock.sector_id,
        sector_name=stock.sector.name if stock.sector else "",
        return_1m=metric.return_1m if metric else None,
        return_6m=metric.return_6m if metric else None,
        return_1y=metric.return_1y if metric else None,
        return_3y=metric.return_3y if metric else None,
        is_analyzed=a.is_analyzed if a else False,
        analyzed_at=a.analyzed_at if a else None,
        quality_status=a.quality_status if a else None,
        desired_price=a.desired_price if a else None,
    )


def _to_status_schema(a: AnalysisStatus) -> AnalysisStatusSchema:
    return AnalysisStatusSchema(
        is_analyzed=a.is_analyzed,
        analyzed_at=a.analyzed_at,
        notes=a.notes,
        quality_status=a.quality_status,
        desired_price=a.desired_price,
        quality_decided_at=a.quality_decided_at,
    )


def _get_stock_or_404(stock_id: int, db: Session) -> Stock:
    stock = (
        db.query(Stock)
        .options(
            joinedload(Stock.analysis),
            joinedload(Stock.sector),
            joinedload(Stock.metrics),
        )
        .filter(Stock.id == stock_id)
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock


# ── Accept stock (quality + desired price) ────────────────────────────────────

@router.post("/stocks/{stock_id}/accept", response_model=AnalysisStatusSchema)
def accept_stock(
    stock_id: int,
    request: AcceptStockRequest,
    db: Session = Depends(get_db),
):
    """Mark stock as analyzed AND accepted with a desired buy price."""
    if request.desired_price <= 0:
        raise HTTPException(status_code=422, detail="desired_price must be > 0")

    stock = _get_stock_or_404(stock_id, db)
    prev_status = stock.analysis.is_analyzed if stock.analysis else False
    a = _ensure_analysis(stock, db)

    a.is_analyzed = True
    a.analyzed_at = datetime.now(timezone.utc)
    a.quality_status = "accepted"
    a.desired_price = request.desired_price
    a.quality_decided_at = datetime.now(timezone.utc)
    a.notes = request.notes

    db.add(AnalysisHistory(
        stock_id=stock_id,
        previous_status=prev_status,
        new_status=True,
        notes=f"Accepted at desired price ₹{request.desired_price}. {request.notes or ''}".strip(),
    ))
    db.commit()
    db.refresh(a)
    return _to_status_schema(a)


# ── Reject stock ──────────────────────────────────────────────────────────────

@router.post("/stocks/{stock_id}/reject", response_model=AnalysisStatusSchema)
def reject_stock(
    stock_id: int,
    request: RejectStockRequest,
    db: Session = Depends(get_db),
):
    """Mark stock as analyzed AND rejected (no price needed)."""
    stock = _get_stock_or_404(stock_id, db)
    prev_status = stock.analysis.is_analyzed if stock.analysis else False
    a = _ensure_analysis(stock, db)

    a.is_analyzed = True
    a.analyzed_at = datetime.now(timezone.utc)
    a.quality_status = "rejected"
    a.desired_price = None
    a.quality_decided_at = datetime.now(timezone.utc)
    a.notes = request.notes

    db.add(AnalysisHistory(
        stock_id=stock_id,
        previous_status=prev_status,
        new_status=True,
        notes=f"Rejected. {request.notes or ''}".strip(),
    ))
    db.commit()
    db.refresh(a)
    return _to_status_schema(a)


# ── Reset to pending ──────────────────────────────────────────────────────────

@router.post("/stocks/{stock_id}/unmark", response_model=AnalysisStatusSchema)
def unmark_analyzed(stock_id: int, db: Session = Depends(get_db)):
    stock = _get_stock_or_404(stock_id, db)
    if not stock.analysis:
        raise HTTPException(status_code=400, detail="No analysis record found")

    prev_status = stock.analysis.is_analyzed
    stock.analysis.is_analyzed = False
    stock.analysis.analyzed_at = None
    stock.analysis.quality_status = None
    stock.analysis.desired_price = None
    stock.analysis.quality_decided_at = None

    db.add(AnalysisHistory(
        stock_id=stock_id,
        previous_status=prev_status,
        new_status=False,
        notes="Reset to pending",
    ))
    db.commit()
    db.refresh(stock.analysis)
    return _to_status_schema(stock.analysis)


# ── Legacy generic analyze endpoint (kept for compatibility) ──────────────────

@router.post("/stocks/{stock_id}/analyze", response_model=AnalysisStatusSchema)
def mark_analyzed(
    stock_id: int,
    request: MarkAnalyzedRequest,
    db: Session = Depends(get_db),
):
    stock = _get_stock_or_404(stock_id, db)
    prev_status = stock.analysis.is_analyzed if stock.analysis else False
    a = _ensure_analysis(stock, db)

    a.is_analyzed = True
    a.analyzed_at = datetime.now(timezone.utc)
    a.notes = request.notes

    db.add(AnalysisHistory(
        stock_id=stock_id,
        previous_status=prev_status,
        new_status=True,
        notes=request.notes,
    ))
    db.commit()
    db.refresh(a)
    return _to_status_schema(a)


# ── Quality stocks list (accepted) ────────────────────────────────────────────

@router.get("/quality", response_model=QualityDashboard)
def get_quality_dashboard(db: Session = Depends(get_db)):
    """Return all accepted stocks + sector breakdown for the Quality Dashboard."""
    accepted_rows = (
        db.query(Stock)
        .join(Stock.analysis)
        .join(Stock.sector)
        .options(
            joinedload(Stock.sector),
            joinedload(Stock.metrics),
            joinedload(Stock.analysis),
        )
        .filter(AnalysisStatus.quality_status == "accepted")
        .order_by(Stock.sector_id, Stock.symbol)
        .all()
    )

    rejected_count = (
        db.query(AnalysisStatus)
        .filter(AnalysisStatus.quality_status == "rejected")
        .count()
    )

    # Build items
    items: List[QualityStockItem] = []
    for s in accepted_rows:
        a = s.analysis
        metric = s.metrics[0] if s.metrics else None
        current_price = None
        if metric and metric.extra_metrics:
            cp = metric.extra_metrics.get("current_price")
            if cp is not None:
                current_price = float(cp)
        items.append(QualityStockItem(
            id=s.id,
            symbol=s.symbol,
            company_name=s.company_name,
            sector_name=s.sector.name if s.sector else "",
            desired_price=a.desired_price or 0.0,
            quality_decided_at=a.quality_decided_at,
            return_1m=metric.return_1m if metric else None,
            return_1y=metric.return_1y if metric else None,
            current_price=current_price,
        ))

    # Sector breakdown
    sector_map: dict = {}
    for item in items:
        sn = item.sector_name
        if sn not in sector_map:
            sector_map[sn] = {"sector": sn, "count": 0, "stocks": []}
        sector_map[sn]["count"] += 1
        sector_map[sn]["stocks"].append(item.symbol)
    sector_breakdown = sorted(sector_map.values(), key=lambda x: x["count"], reverse=True)

    return QualityDashboard(
        total_accepted=len(items),
        total_rejected=rejected_count,
        sector_breakdown=sector_breakdown,
        stocks=items,
    )


# ── Download quality stocks as Excel ─────────────────────────────────────────

@router.get("/quality/download")
def download_quality_excel(db: Session = Depends(get_db)):
    """
    Generate and stream a single Excel file with all accepted (quality) stocks.
    Columns: NAME | SECTOR | DESIRED PRICE | CURRENT PRICE | 1M RETURN | 1Y RETURN | ACCEPTED ON
    """
    try:
        import openpyxl
        from openpyxl.styles import (
            Font, PatternFill, Alignment, Border, Side
        )
        from openpyxl.utils import get_column_letter
    except ImportError:
        raise HTTPException(status_code=500, detail="openpyxl not installed")

    accepted_rows = (
        db.query(Stock)
        .join(Stock.analysis)
        .join(Stock.sector)
        .options(
            joinedload(Stock.sector),
            joinedload(Stock.metrics),
            joinedload(Stock.analysis),
        )
        .filter(AnalysisStatus.quality_status == "accepted")
        .order_by(Stock.sector_id, Stock.symbol)
        .all()
    )

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Quality Stocks"

    # ── Styles ────────────────────────────────────────────────────────────────
    header_fill   = PatternFill("solid", fgColor="1E3A5F")
    header_font   = Font(bold=True, color="FFFFFF", size=11)
    header_align  = Alignment(horizontal="center", vertical="center")

    accent_fill   = PatternFill("solid", fgColor="E8F4FD")
    alt_fill      = PatternFill("solid", fgColor="F8FBFF")

    price_font    = Font(bold=True, color="1A7F37")
    sector_font   = Font(italic=True, color="555555")

    thin = Side(style="thin", color="BDD7EE")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    center = Alignment(horizontal="center", vertical="center")
    left   = Alignment(horizontal="left",   vertical="center")

    # ── Header row ────────────────────────────────────────────────────────────
    headers = ["#", "Stock Symbol", "Sector", "Desired Price (₹)",
               "Current Price (₹)", "1M Return %", "1Y Return %", "Accepted On"]
    col_widths = [5, 18, 26, 20, 20, 15, 15, 22]

    ws.row_dimensions[1].height = 28
    for ci, (h, w) in enumerate(zip(headers, col_widths), start=1):
        cell = ws.cell(row=1, column=ci, value=h)
        cell.font   = header_font
        cell.fill   = header_fill
        cell.alignment = header_align
        cell.border = border
        ws.column_dimensions[get_column_letter(ci)].width = w

    # ── Data rows ─────────────────────────────────────────────────────────────
    for row_i, s in enumerate(accepted_rows, start=1):
        a      = s.analysis
        metric = s.metrics[0] if s.metrics else None
        current_price = None
        if metric and metric.extra_metrics:
            cp = metric.extra_metrics.get("current_price")
            if cp is not None:
                current_price = round(float(cp), 2)

        decided_str = ""
        if a.quality_decided_at:
            decided_str = a.quality_decided_at.strftime("%d %b %Y")

        fill = accent_fill if row_i % 2 == 0 else alt_fill
        ws.row_dimensions[row_i + 1].height = 20

        row_data = [
            row_i,
            s.symbol,
            s.sector.name if s.sector else "",
            round(a.desired_price, 2) if a.desired_price else "",
            current_price if current_price is not None else "",
            round(metric.return_1m, 2) if (metric and metric.return_1m is not None) else "",
            round(metric.return_1y, 2) if (metric and metric.return_1y is not None) else "",
            decided_str,
        ]

        for ci, val in enumerate(row_data, start=1):
            cell = ws.cell(row=row_i + 1, column=ci, value=val)
            cell.fill   = fill
            cell.border = border
            cell.alignment = center

            # Special formatting
            if ci == 2:  # symbol bold
                cell.font = Font(bold=True, size=10)
                cell.alignment = left
            elif ci == 3:  # sector italic
                cell.font = sector_font
                cell.alignment = left
            elif ci == 4:  # desired price green bold
                cell.font = price_font
                cell.number_format = '#,##0.00'
            elif ci == 5:  # current price
                cell.number_format = '#,##0.00'
            elif ci in (6, 7):  # returns - color by sign
                if isinstance(val, (int, float)):
                    cell.font = Font(
                        color="1A7F37" if val >= 0 else "CF222E",
                        bold=True, size=10
                    )
                    cell.number_format = '+0.00;-0.00'

    # ── Freeze header row ─────────────────────────────────────────────────────
    ws.freeze_panes = "A2"

    # ── Summary section (two rows gap, then summary) ──────────────────────────
    total_rows = len(accepted_rows)
    gap_row = total_rows + 3
    ws.cell(row=gap_row, column=1, value="Total Quality Stocks:").font = Font(bold=True)
    ws.cell(row=gap_row, column=2, value=total_rows).font = Font(bold=True, color="1A7F37")

    # ── Stream response ───────────────────────────────────────────────────────
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"quality_stocks_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Analyzed / Pending lists ──────────────────────────────────────────────────

@router.get("/analyzed", response_model=PaginatedStocks)
def get_analyzed_stocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sector_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Stock)
        .join(Stock.analysis)
        .join(Stock.sector)
        .options(joinedload(Stock.sector), joinedload(Stock.metrics), joinedload(Stock.analysis))
        .filter(AnalysisStatus.is_analyzed == True)
    )
    if sector_id:
        query = query.filter(Stock.sector_id == sector_id)
    if search:
        term = f"%{search.upper()}%"
        query = query.filter(or_(Stock.symbol.ilike(term), Stock.company_name.ilike(term)))
    query = query.order_by(AnalysisStatus.analyzed_at.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return PaginatedStocks(
        items=[_build_list_item(s) for s in items],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    )


@router.get("/pending", response_model=PaginatedStocks)
def get_pending_stocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sector_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Stock)
        .outerjoin(Stock.analysis)
        .join(Stock.sector)
        .options(joinedload(Stock.sector), joinedload(Stock.metrics), joinedload(Stock.analysis))
        .filter(or_(AnalysisStatus.is_analyzed == False, AnalysisStatus.is_analyzed == None))
    )
    if sector_id:
        query = query.filter(Stock.sector_id == sector_id)
    if search:
        term = f"%{search.upper()}%"
        query = query.filter(or_(Stock.symbol.ilike(term), Stock.company_name.ilike(term)))
    query = query.order_by(Stock.symbol.asc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return PaginatedStocks(
        items=[_build_list_item(s) for s in items],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    )


@router.get("/history", response_model=List[AnalysisHistoryItem])
def get_history(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(AnalysisHistory)
        .options(joinedload(AnalysisHistory.stock).joinedload(Stock.sector))
        .order_by(desc(AnalysisHistory.changed_at))
        .limit(limit)
        .all()
    )
    return [
        AnalysisHistoryItem(
            id=r.id,
            stock_id=r.stock_id,
            stock_symbol=r.stock.symbol if r.stock else "",
            sector_name=r.stock.sector.name if (r.stock and r.stock.sector) else "",
            previous_status=r.previous_status,
            new_status=r.new_status,
            changed_at=r.changed_at,
            notes=r.notes,
        )
        for r in rows
    ]
