from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter()


@router.post('/batch')
def ingest_batch(payload: schemas.TelemetryBatchPayload, db: Session = Depends(get_db)):
    inserted = crud.create_telemetry_batch(db, payload)
    return {'status': 'ok', 'inserted': inserted}
