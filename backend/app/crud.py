import uuid

from sqlalchemy.orm import Session

from . import models, schemas


def get_user_by_google_id(db: Session, google_id: str) -> models.User | None:
    return db.query(models.User).filter(models.User.google_id == google_id).first()


def create_user(db: Session, google_id: str = '', email: str = '', full_name: str = '') -> models.User:
    user = models.User(google_id=google_id or None, email=email or '', full_name=full_name or None)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user_by_email(db: Session, email: str) -> models.User:
    user = models.User(email=email, is_guest=0)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_guest_id(db: Session, guest_id: str) -> models.User | None:
    return db.query(models.User).filter(models.User.guest_id == guest_id).first()


def create_guest_user(db: Session) -> models.User:
    guest_id = uuid.uuid4().hex[:12].upper()
    user = models.User(guest_id=guest_id, email=f'guest_{guest_id.lower()}@cognimap.local', is_guest=1)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def link_session_to_user(db: Session, session_id: str, user_id: int) -> None:
    session = db.query(models.AssessmentSession).filter_by(session_id=session_id).first()
    if session:
        session.user_id = user_id
        db.commit()


def create_or_get_session(db: Session, session_id: str, age_bracket: str | None = None) -> models.AssessmentSession:
    session = db.query(models.AssessmentSession).filter_by(session_id=session_id).first()
    if not session:
        session = models.AssessmentSession(session_id=session_id, age_bracket=age_bracket)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def create_telemetry_batch(db: Session, payload: schemas.TelemetryBatchPayload) -> int:
    assessment_session = create_or_get_session(db, payload.session_id, payload.age_bracket)
    inserted = 0
    for event_payload in payload.events:
        event = models.TelemetryEvent(
            session_id=assessment_session.session_id,
            event_type=event_payload.event_type,
            event_timestamp=event_payload.timestamp,
            data=event_payload.data,
        )
        db.add(event)
        inserted += 1
    db.commit()
    return inserted


def get_profile_by_session(db: Session, session_id: str) -> models.CognitiveProfile | None:
    return db.query(models.CognitiveProfile).filter(models.CognitiveProfile.session_id == session_id).first()
