from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime,
    ForeignKey, Boolean, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Sector(Base):
    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stocks = relationship("Stock", back_populates="sector", cascade="all, delete-orphan")


class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    company_name = Column(String(200), nullable=True)
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=False)
    source_file = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (UniqueConstraint("symbol", "sector_id", name="uq_symbol_sector"),)

    sector = relationship("Sector", back_populates="stocks")
    metrics = relationship("StockMetric", back_populates="stock", cascade="all, delete-orphan")
    analysis = relationship("AnalysisStatus", back_populates="stock", uselist=False, cascade="all, delete-orphan")
    history = relationship("AnalysisHistory", back_populates="stock", cascade="all, delete-orphan")
    shareholding = relationship("ShareholdingData", back_populates="stock", cascade="all, delete-orphan")


class StockMetric(Base):
    __tablename__ = "stock_metrics"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    return_1m = Column(Float, nullable=True)
    return_6m = Column(Float, nullable=True)
    return_1y = Column(Float, nullable=True)
    return_3y = Column(Float, nullable=True)
    pros = Column(Text, nullable=True)
    cons = Column(Text, nullable=True)
    extra_metrics = Column(JSON, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    stock = relationship("Stock", back_populates="metrics")


class ShareholdingData(Base):
    __tablename__ = "shareholding_data"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    quarter = Column(String(20), nullable=False)
    dii_percent = Column(Float, nullable=True)
    fii_percent = Column(Float, nullable=True)

    __table_args__ = (UniqueConstraint("stock_id", "quarter", name="uq_stock_quarter"),)

    stock = relationship("Stock", back_populates="shareholding")


class AnalysisStatus(Base):
    __tablename__ = "analysis_status"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, unique=True)
    is_analyzed = Column(Boolean, default=False, nullable=False)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    # ── Quality decision ────────────────────────────────────────────────────
    # "accepted" | "rejected" | None (not yet decided)
    quality_status = Column(String(20), nullable=True, default=None)
    desired_price = Column(Float, nullable=True, default=None)
    quality_decided_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    stock = relationship("Stock", back_populates="analysis")


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    previous_status = Column(Boolean, nullable=False)
    new_status = Column(Boolean, nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)

    stock = relationship("Stock", back_populates="history")
