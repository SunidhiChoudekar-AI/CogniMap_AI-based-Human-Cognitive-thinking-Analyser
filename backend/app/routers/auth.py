from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..config import GOOGLE_CLIENT_ID, SECRET_KEY
from ..database import get_db

router = APIRouter()


def _make_token(user, extra_claims=None):
    expiration = datetime.utcnow() + timedelta(days=7)
    payload = {
        'user_id': user.id,
        'exp': expiration,
    }
    if user.email:
        payload['email'] = user.email
    if user.guest_id:
        payload['guest_id'] = user.guest_id
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def _build_user_out(user):
    return {
        'id': user.id,
        'email': '' if user.is_guest else (user.email or ''),
        'full_name': user.full_name,
        'guest_id': user.guest_id,
        'is_guest': bool(user.is_guest),
    }


@router.post('/google', response_model=schemas.GoogleAuthResponse)
def google_auth(payload: schemas.GoogleAuthRequest, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail='Google Client ID not configured')

    try:
        idinfo = id_token.verify_oauth2_token(
            payload.token,
            requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail='Invalid Google token') from exc

    google_id = idinfo['sub']
    email = idinfo.get('email', '')
    name = idinfo.get('name', '')

    user = crud.get_user_by_google_id(db, google_id)
    if not user:
        user = crud.create_user(db, google_id=google_id, email=email, full_name=name)

    token = _make_token(user)

    if payload.session_id:
        crud.link_session_to_user(db, payload.session_id, user.id)

    return {'token': token, 'user': _build_user_out(user)}


@router.post('/email', response_model=schemas.AuthResponse)
def email_auth(payload: schemas.EmailAuthRequest, db: Session = Depends(get_db)):
    if not payload.email or '@' not in payload.email:
        raise HTTPException(status_code=400, detail='Valid email is required')

    user = crud.get_user_by_email(db, payload.email)
    if not user:
        user = crud.create_user_by_email(db, payload.email)

    token = _make_token(user)

    if payload.session_id:
        crud.link_session_to_user(db, payload.session_id, user.id)

    return {'token': token, 'user': _build_user_out(user)}


@router.post('/guest/create', response_model=schemas.AuthResponse)
def guest_create(payload: schemas.GuestAuthRequest, db: Session = Depends(get_db)):
    user = crud.create_guest_user(db)
    token = _make_token(user)

    if payload.session_id:
        crud.link_session_to_user(db, payload.session_id, user.id)

    return {'token': token, 'user': _build_user_out(user)}


@router.post('/guest/login', response_model=schemas.AuthResponse)
def guest_login(payload: schemas.GuestLoginRequest, db: Session = Depends(get_db)):
    if not payload.guest_id:
        raise HTTPException(status_code=400, detail='Guest ID is required')

    user = crud.get_user_by_guest_id(db, payload.guest_id)
    if not user:
        raise HTTPException(status_code=404, detail='Guest ID not found')

    token = _make_token(user)

    if payload.session_id:
        crud.link_session_to_user(db, payload.session_id, user.id)

    return {'token': token, 'user': _build_user_out(user)}
