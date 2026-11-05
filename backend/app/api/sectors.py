from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models.models import Sector, Stock, AnalysisStatus
from app.schemas import SectorSummary, DashboardSummary

router = APIRouter(prefix="/api/sectors", tags=["sectors"])


def _sector_summary(sector: Sector, db: Session) -> SectorSummary:
    total = db.query(Stock).filter(Stock.sector_id == sector.id).count()
    analyzed = (
        db.query(AnalysisStatus)
        .join(Stock)
        .filter(Stock.sector_id == sector.id, AnalysisStatus.is_analyzed == True)
        .count()
    )
    pending = total - analyzed
    pct = round((analyzed / total * 100), 2) if total > 0 else 0.0
    return SectorSummary(
        id=sector.id,
        name=sector.name,
        total_stocks=total,
        analyzed_stocks=analyzed,
        pending_stocks=pending,
        completion_pct=pct,
    )


@router.get("", response_model=List[SectorSummary])
def list_sectors(db: Session = Depends(get_db)):
    sectors = db.query(Sector).order_by(Sector.name).all()
    return [_sector_summary(s, db) for s in sectors]


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    sectors = db.query(Sector).order_by(Sector.name).all()
    sector_summaries = [_sector_summary(s, db) for s in sectors]

    total_stocks = sum(s.total_stocks for s in sector_summaries)
    analyzed = sum(s.analyzed_stocks for s in sector_summaries)
    pending = total_stocks - analyzed
    pct = round((analyzed / total_stocks * 100), 2) if total_stocks > 0 else 0.0

    return DashboardSummary(
        total_sectors=len(sectors),
        total_stocks=total_stocks,
        analyzed_stocks=analyzed,
        pending_stocks=pending,
        completion_pct=pct,
        sectors=sector_summaries,
    )


@router.get("/{sector_id}", response_model=SectorSummary)
def get_sector(sector_id: int, db: Session = Depends(get_db)):
    sector = db.query(Sector).filter(Sector.id == sector_id).first()
    if not sector:
        raise HTTPException(status_code=404, detail="Sector not found")
    return _sector_summary(sector, db)
