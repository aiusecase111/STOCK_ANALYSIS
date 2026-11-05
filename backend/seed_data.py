"""
Seed script: imports the IT sector Excel and enriches stocks with current price
from returns_summary_tc.csv.
Run once: python seed_data.py
"""
import os
import sys
import pandas as pd

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import models
from app.services.importer import import_excel

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

def seed():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # ── Import IT sector Excel ──────────────────────────────────────────
        it_excel = os.path.join(DATA_DIR, "final_combined_df_modified_BSE_stocks.xlsx")
        if os.path.exists(it_excel):
            print("Importing Information Technology sector from Excel...")
            result = import_excel(it_excel, "Information Technology", db)
            print(f"  ✓ {result.successfully_imported} imported, "
                  f"{result.duplicates_skipped} duplicates, "
                  f"{result.failed_rows} failed")
            if result.failed_details:
                for d in result.failed_details[:5]:
                    print(f"    - {d}")
        else:
            print(f"  ✗ IT Excel not found at {it_excel}")

        # ── Enrich with current price from returns_summary_tc.csv ──────────
        tc_csv = os.path.join(DATA_DIR, "returns_summary_tc.csv")
        if os.path.exists(tc_csv):
            print("Enriching stocks with current prices from returns_summary_tc.csv...")
            tc_df = pd.read_csv(tc_csv)
            # Ticker column has .NS suffix - strip it for matching
            tc_df["symbol_clean"] = tc_df["Ticker"].str.replace(r"\.\w+$", "", regex=True).str.upper()

            enriched = 0
            for _, row in tc_df.iterrows():
                sym = row["symbol_clean"]
                price = row.get("Current Price")
                if pd.isna(price):
                    continue
                stock = db.query(models.Stock).filter(models.Stock.symbol == sym).first()
                if stock:
                    # Store current price in extra_metrics
                    metric = stock.metrics[0] if stock.metrics else None
                    if metric:
                        em = metric.extra_metrics or {}
                        em["current_price"] = float(price)
                        # Also store additional returns
                        for col in ["1D Return %", "1W Return %", "3M Return %", "5Y Return %"]:
                            val = row.get(col)
                            if not pd.isna(val):
                                em[col] = float(val)
                        metric.extra_metrics = em
                        enriched += 1
            db.commit()
            print(f"  ✓ Enriched {enriched} stocks with current price data")

        # ── Summary ────────────────────────────────────────────────────────
        total_sectors = db.query(models.Sector).count()
        total_stocks = db.query(models.Stock).count()
        print(f"\nDatabase Summary:")
        print(f"  Sectors: {total_sectors}")
        print(f"  Stocks:  {total_stocks}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("\nSeed complete. Run: uvicorn main:app --reload")
