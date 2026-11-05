"""
Excel / CSV / PDF import service.
Dynamically detects columns and maps them to the database schema.
"""
import re
import os
from typing import Tuple, Dict, Any, List, Optional
import pandas as pd
from sqlalchemy.orm import Session

from app.models.models import Sector, Stock, StockMetric, ShareholdingData, AnalysisStatus
from app.schemas import ImportResult

# ── Quarter column detection ──────────────────────────────────────────────────
QUARTER_PATTERN = re.compile(
    r"^(DIIs?\+?|FIIs?\+?)_?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{4}$",
    re.IGNORECASE,
)

RETURN_COL_MAP = {
    "1m return %": "return_1m",
    "1m return": "return_1m",
    "6m return %": "return_6m",
    "6m return": "return_6m",
    "1y return %": "return_1y",
    "1y return": "return_1y",
    "3y return %": "return_3y",
    "3y return": "return_3y",
}

PROS_NAMES = {"pros", "pro", "strengths", "advantages"}
CONS_NAMES = {"cons", "con", "weaknesses", "disadvantages"}
STOCK_NAMES = {"stock", "symbol", "ticker", "scrip"}


def _clean_float(val: Any) -> Optional[float]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return float(str(val).replace("%", "").strip())
    except (ValueError, TypeError):
        return None


def _clean_str(val: Any) -> Optional[str]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    # Normalize bullet characters
    s = s.replace("\u2022", "•").replace("\xe2\x80\xa2", "•")
    return s if s else None


def _parse_quarter_col(col: str) -> Tuple[Optional[str], Optional[str]]:
    """Return (inst_type, quarter_label) e.g. ('dii', 'Jun 2024') or (None, None)."""
    m = QUARTER_PATTERN.match(col.strip())
    if not m:
        return None, None
    prefix = m.group(1).lower()
    month = m.group(2)
    year_match = re.search(r"\d{4}", col)
    year = year_match.group() if year_match else ""
    inst = "dii" if "dii" in prefix else "fii"
    quarter = f"{month} {year}"
    return inst, quarter


def import_excel(
    file_path: str,
    sector_name: str,
    db: Session,
) -> ImportResult:
    """Read an Excel/CSV file and upsert stocks into the database."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(file_path, dtype=str)
    else:
        df = pd.read_excel(file_path, dtype=str)

    df.columns = [str(c).strip() for c in df.columns]

    # Normalise column map
    col_lower: Dict[str, str] = {c.lower(): c for c in df.columns}

    # Identify stock symbol column
    stock_col = None
    for cname in STOCK_NAMES:
        if cname in col_lower:
            stock_col = col_lower[cname]
            break
    if stock_col is None:
        stock_col = df.columns[0]  # fallback to first column

    # Identify return columns
    return_cols: Dict[str, str] = {}
    for cname, field in RETURN_COL_MAP.items():
        if cname in col_lower:
            return_cols[field] = col_lower[cname]

    # Identify pros / cons
    pros_col = next((col_lower[c] for c in col_lower if c in PROS_NAMES), None)
    cons_col = next((col_lower[c] for c in col_lower if c in CONS_NAMES), None)

    # Identify shareholding columns
    # Group by quarter → {quarter: {dii: col, fii: col}}
    shareholding_cols: Dict[str, Dict[str, str]] = {}
    for col in df.columns:
        inst, quarter = _parse_quarter_col(col)
        if inst and quarter:
            shareholding_cols.setdefault(quarter, {})[inst] = col

    # Known columns (to exclude from extra_metrics)
    known_cols = {stock_col, pros_col, cons_col}
    known_cols.update(return_cols.values())
    for q_dict in shareholding_cols.values():
        known_cols.update(q_dict.values())
    known_cols.discard(None)

    # Extra metric columns (sector-specific)
    extra_metric_cols = [c for c in df.columns if c not in known_cols]

    # Ensure sector exists
    sector = db.query(Sector).filter(Sector.name == sector_name).first()
    if not sector:
        sector = Sector(name=sector_name)
        db.add(sector)
        db.commit()
        db.refresh(sector)

    total_rows = 0
    imported = 0
    duplicates = 0
    failed = 0
    failed_details: List[str] = []

    for _, row in df.iterrows():
        symbol_raw = _clean_str(row.get(stock_col))
        if not symbol_raw:
            continue
        symbol = symbol_raw.upper().strip()
        total_rows += 1

        try:
            # Upsert stock
            stock = (
                db.query(Stock)
                .filter(Stock.symbol == symbol, Stock.sector_id == sector.id)
                .first()
            )
            is_new = stock is None
            if not stock:
                stock = Stock(
                    symbol=symbol,
                    sector_id=sector.id,
                    source_file=os.path.basename(file_path),
                )
                db.add(stock)
                db.flush()
            else:
                duplicates += 1

            # Upsert metrics
            metric = stock.metrics[0] if stock.metrics else None
            if not metric:
                metric = StockMetric(stock_id=stock.id)
                db.add(metric)

            metric.return_1m = _clean_float(row.get(return_cols.get("return_1m", "")))
            metric.return_6m = _clean_float(row.get(return_cols.get("return_6m", "")))
            metric.return_1y = _clean_float(row.get(return_cols.get("return_1y", "")))
            metric.return_3y = _clean_float(row.get(return_cols.get("return_3y", "")))
            metric.pros = _clean_str(row.get(pros_col)) if pros_col else None
            metric.cons = _clean_str(row.get(cons_col)) if cons_col else None

            # Extra metrics
            extra: Dict[str, Any] = {}
            for ec in extra_metric_cols:
                val = _clean_str(row.get(ec))
                if val is not None:
                    extra[ec] = val
            metric.extra_metrics = extra if extra else None

            # Shareholding
            existing_quarters = {sh.quarter for sh in stock.shareholding}
            for quarter, qdict in shareholding_cols.items():
                dii_val = _clean_float(row.get(qdict.get("dii", "")))
                fii_val = _clean_float(row.get(qdict.get("fii", "")))

                if quarter in existing_quarters:
                    # update
                    sh = next(s for s in stock.shareholding if s.quarter == quarter)
                    sh.dii_percent = dii_val
                    sh.fii_percent = fii_val
                else:
                    sh = ShareholdingData(
                        stock_id=stock.id,
                        quarter=quarter,
                        dii_percent=dii_val,
                        fii_percent=fii_val,
                    )
                    db.add(sh)

            # Ensure analysis_status row exists
            if not stock.analysis:
                analysis = AnalysisStatus(stock_id=stock.id, is_analyzed=False)
                db.add(analysis)

            if is_new:
                imported += 1

        except Exception as exc:
            failed += 1
            failed_details.append(f"Row {symbol}: {str(exc)[:120]}")
            db.rollback()
            # Re-ensure sector after rollback
            sector = db.query(Sector).filter(Sector.name == sector_name).first()
            continue

    db.commit()

    return ImportResult(
        file_name=os.path.basename(file_path),
        sector_name=sector_name,
        total_rows_detected=total_rows,
        successfully_imported=imported,
        duplicates_skipped=duplicates,
        failed_rows=failed,
        failed_details=failed_details,
        detected_columns=list(df.columns),
    )


def import_pdf(file_path: str, sector_name: str, db: Session) -> ImportResult:
    """
    Attempt to extract tables from a PDF and import them.
    Falls back gracefully if pdfplumber cannot extract structured data.
    """
    try:
        import pdfplumber
    except ImportError:
        return ImportResult(
            file_name=os.path.basename(file_path),
            sector_name=sector_name,
            total_rows_detected=0,
            successfully_imported=0,
            duplicates_skipped=0,
            failed_rows=0,
            failed_details=["pdfplumber is not installed."],
            detected_columns=[],
        )

    all_rows: List[Dict] = []
    all_headers: List[str] = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table:
                        continue
                    headers = [str(h).strip() if h else "" for h in table[0]]
                    if not all_headers:
                        all_headers = headers
                    for data_row in table[1:]:
                        row_dict = {
                            all_headers[i]: (data_row[i] if i < len(data_row) else None)
                            for i in range(len(all_headers))
                        }
                        all_rows.append(row_dict)
    except Exception as exc:
        return ImportResult(
            file_name=os.path.basename(file_path),
            sector_name=sector_name,
            total_rows_detected=0,
            successfully_imported=0,
            duplicates_skipped=0,
            failed_rows=1,
            failed_details=[f"PDF extraction failed: {str(exc)[:200]}"],
            detected_columns=[],
        )

    if not all_rows:
        return ImportResult(
            file_name=os.path.basename(file_path),
            sector_name=sector_name,
            total_rows_detected=0,
            successfully_imported=0,
            duplicates_skipped=0,
            failed_rows=0,
            failed_details=["No tables detected in the PDF. Please use Excel format for reliable import."],
            detected_columns=[],
        )

    # Write to temp CSV and reuse excel importer
    import tempfile, csv
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="") as tmp:
        writer = csv.DictWriter(tmp, fieldnames=all_headers)
        writer.writeheader()
        writer.writerows(all_rows)
        tmp_path = tmp.name

    result = import_excel(tmp_path, sector_name, db)
    os.unlink(tmp_path)
    result.file_name = os.path.basename(file_path)
    return result
