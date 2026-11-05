import os
import shutil
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.importer import import_excel, import_pdf
from app.schemas import ImportResult

router = APIRouter(prefix="/api/import", tags=["import"])

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads",
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/excel", response_model=ImportResult)
async def upload_excel(
    file: UploadFile = File(...),
    sector_name: str = Form(...),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".xlsx", ".xls", ".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only .xlsx, .xls, and .csv files are supported.",
        )

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    result = import_excel(save_path, sector_name, db)
    return result


@router.post("/pdf", response_model=ImportResult)
async def upload_pdf(
    file: UploadFile = File(...),
    sector_name: str = Form(...),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Only .pdf files are supported.")

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    result = import_pdf(save_path, sector_name, db)
    return result


@router.post("/auto", response_model=ImportResult)
async def auto_import(
    file: UploadFile = File(...),
    sector_name: str = Form(...),
    db: Session = Depends(get_db),
):
    """Auto-detect file type and import."""
    ext = os.path.splitext(file.filename)[1].lower()
    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    if ext == ".pdf":
        return import_pdf(save_path, sector_name, db)
    elif ext in (".xlsx", ".xls", ".csv"):
        return import_excel(save_path, sector_name, db)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
