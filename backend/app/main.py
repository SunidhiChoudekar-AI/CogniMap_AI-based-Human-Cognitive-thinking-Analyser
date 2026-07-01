from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from .config import ORIGINS
from .database import engine, Base
from .routers import telemetry, profiles, auth
from .schemas import ScenarioResponse
from .scenarios import get_scenario

Base.metadata.create_all(bind=engine)

inspector = inspect(engine)
existing_cols = {c['name'] for c in inspector.get_columns('users')}
with engine.connect() as conn:
    for col, definition in [
        ('google_id', 'VARCHAR'),
        ('full_name', 'VARCHAR'),
        ('guest_id', 'VARCHAR'),
        ('is_guest', 'INTEGER DEFAULT 0'),
    ]:
        if col not in existing_cols:
            conn.execute(text(f'ALTER TABLE users ADD COLUMN {col} {definition}'))
    conn.commit()

app = FastAPI(title='CogniMap API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(telemetry.router, prefix='/api/telemetry', tags=['telemetry'])
app.include_router(profiles.router, prefix='/api/profile', tags=['profile'])
app.include_router(auth.router, prefix='/api/auth', tags=['auth'])


@app.get('/')
def root():
    return {'message': 'CogniMap API is running.'}


@app.get('/api/module/tone-mixer/scenario', response_model=ScenarioResponse)
def get_tone_mixer_scenario(age_bracket: str = Query('15-24')):
    scenario = get_scenario(age_bracket)
    if scenario is None:
        scenario = get_scenario('15-24')
    return scenario
