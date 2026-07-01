from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, func
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    guest_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False, default='')
    full_name = Column(String, nullable=True)
    is_guest = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sessions = relationship('AssessmentSession', back_populates='user')


class AssessmentSession(Base):
    __tablename__ = 'assessment_sessions'

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    age_bracket = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship('User', back_populates='sessions')
    telemetry_events = relationship('TelemetryEvent', back_populates='session')
    module_runs = relationship('ModuleRun', back_populates='session')


class ModuleRun(Base):
    __tablename__ = 'module_runs'

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('assessment_sessions.session_id'), nullable=False)
    module_key = Column(String, nullable=False)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship('AssessmentSession', back_populates='module_runs')


class TelemetryEvent(Base):
    __tablename__ = 'telemetry_events'

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('assessment_sessions.session_id'), index=True, nullable=False)
    event_type = Column(String, nullable=False)
    event_timestamp = Column(String, nullable=False)
    data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship('AssessmentSession', back_populates='telemetry_events')


class CognitiveProfile(Base):
    __tablename__ = 'cognitive_profiles'

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('assessment_sessions.session_id'), unique=True, index=True, nullable=False)
    score_data = Column(JSON, nullable=True)
    narrative = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship('AssessmentSession')
