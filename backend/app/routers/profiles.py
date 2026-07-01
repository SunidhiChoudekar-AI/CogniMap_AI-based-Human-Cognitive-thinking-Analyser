from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas
from ..analysis import build_cognitive_profile

router = APIRouter()


@router.get('/{session_id}', response_model=schemas.CognitiveProfileOut)
def read_profile(session_id: str, db: Session = Depends(get_db)):
    profile = crud.get_profile_by_session(db, session_id)
    try:
        profile = build_cognitive_profile(session_id, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail='Unable to generate cognitive profile') from exc
    return profile
