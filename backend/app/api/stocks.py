from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from typing import Optional, List
import math

from app.database import get_db
from app.models.models import Stock, Sector, StockMetric, AnalysisStatus, ShareholdingData
from app.schemas import (
    StockListItem, StockDetail, StockMetricSchema,
    ShareholdingPoint, AnalysisStatusSchema, PaginatedStocks, SearchResult
)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


def _build_list_item(stock: Stock) -> StockListItem:
    metric = stock.metrics[0] if stock.metrics else None
    analysis = stock.analysis
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
        is_analyzed=analysis.is_analyzed if analysis else False,
        analyzed_at=analysis.analyzed_at if analysis else None,
        quality_status=analysis.quality_status if analysis else None,
        desired_price=analysis.desired_price if analysis else None,
    )


@router.get("", response_model=PaginatedStocks)
def list_stocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sector_id: Optional[int] = None,
    is_analyzed: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None),
    sort_dir: Optional[str] = Query("desc"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Stock)
        .join(Stock.sector)
        .outerjoin(Stock.analysis)
        .options(
            joinedload(Stock.sector),
            joinedload(Stock.metrics),
            joinedload(Stock.analysis),
        )
    )

    if sector_id is not None:
        query = query.filter(Stock.sector_id == sector_id)

    if is_analyzed is not None:
        if is_analyzed:
            query = query.filter(AnalysisStatus.is_analyzed == True)
        else:
            query = query.filter(
                or_(AnalysisStatus.is_analyzed == False, AnalysisStatus.is_analyzed == None)
            )

    if search:
        term = f"%{search.upper()}%"
        query = query.filter(
            or_(Stock.symbol.ilike(term), Stock.company_name.ilike(term))
        )

    # Sorting
    sort_col_map = {
        "symbol": Stock.symbol,
        "return_1m": StockMetric.return_1m,
        "return_6m": StockMetric.return_6m,
        "return_1y": StockMetric.return_1y,
        "return_3y": StockMetric.return_3y,
    }
    if sort_by and sort_by in sort_col_map:
        col = sort_col_map[sort_by]
        if sort_by != "symbol":
            query = query.outerjoin(Stock.metrics)
        query = query.order_by(col.desc() if sort_dir == "desc" else col.asc())
    else:
        query = query.order_by(Stock.symbol.asc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedStocks(
        items=[_build_list_item(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/search", response_model=List[SearchResult])
def search_stocks(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    term = f"%{q.upper()}%"
    stocks = (
        db.query(Stock)
        .join(Stock.sector)
        .outerjoin(Stock.analysis)
        .options(joinedload(Stock.sector), joinedload(Stock.analysis))
        .filter(or_(Stock.symbol.ilike(term), Stock.company_name.ilike(term)))
        .limit(limit)
        .all()
    )
    return [
        SearchResult(
            id=s.id,
            symbol=s.symbol,
            company_name=s.company_name,
            sector_id=s.sector_id,
            sector_name=s.sector.name if s.sector else "",
            is_analyzed=s.analysis.is_analyzed if s.analysis else False,
        )
        for s in stocks
    ]


@router.get("/{stock_id}", response_model=StockDetail)
def get_stock(stock_id: int, db: Session = Depends(get_db)):
    stock = (
        db.query(Stock)
        .options(
            joinedload(Stock.sector),
            joinedload(Stock.metrics),
            joinedload(Stock.analysis),
            joinedload(Stock.shareholding),
        )
        .filter(Stock.id == stock_id)
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    metric = stock.metrics[0] if stock.metrics else None

    # Sort shareholding by quarter chronologically
    quarter_order = [
        "Jun 2024", "Sep 2024", "Dec 2024", "Mar 2025",
        "Jun 2025", "Sep 2025", "Dec 2025", "Mar 2026",
        "Jun 2026", "Sep 2026",
    ]

    def quarter_sort_key(sh):
        try:
            return quarter_order.index(sh.quarter)
        except ValueError:
            return 999

    sorted_shareholding = sorted(stock.shareholding, key=quarter_sort_key)

    return StockDetail(
        id=stock.id,
        symbol=stock.symbol,
        company_name=stock.company_name,
        sector_id=stock.sector_id,
        sector_name=stock.sector.name if stock.sector else "",
        source_file=stock.source_file,
        created_at=stock.created_at,
        metrics=StockMetricSchema(
            return_1m=metric.return_1m if metric else None,
            return_6m=metric.return_6m if metric else None,
            return_1y=metric.return_1y if metric else None,
            return_3y=metric.return_3y if metric else None,
            pros=metric.pros if metric else None,
            cons=metric.cons if metric else None,
            extra_metrics=metric.extra_metrics if metric else None,
        ) if metric else None,
        shareholding=[
            ShareholdingPoint(
                quarter=sh.quarter,
                dii_percent=sh.dii_percent,
                fii_percent=sh.fii_percent,
            )
            for sh in sorted_shareholding
        ],
        analysis=AnalysisStatusSchema(
            is_analyzed=stock.analysis.is_analyzed if stock.analysis else False,
            analyzed_at=stock.analysis.analyzed_at if stock.analysis else None,
            notes=stock.analysis.notes if stock.analysis else None,
            quality_status=stock.analysis.quality_status if stock.analysis else None,
            desired_price=stock.analysis.desired_price if stock.analysis else None,
            quality_decided_at=stock.analysis.quality_decided_at if stock.analysis else None,
        ) if stock.analysis else None,
    )
