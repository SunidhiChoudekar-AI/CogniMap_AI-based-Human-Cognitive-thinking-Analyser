from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class GoogleAuthRequest(BaseModel):
    token: str
    session_id: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str = ''
    full_name: Optional[str] = None
    guest_id: Optional[str] = None
    is_guest: bool = False

    model_config = {"from_attributes": True}


class GoogleAuthResponse(BaseModel):
    token: str
    user: UserOut


class EmailAuthRequest(BaseModel):
    email: str
    session_id: Optional[str] = None


class GuestAuthRequest(BaseModel):
    session_id: Optional[str] = None


class GuestLoginRequest(BaseModel):
    guest_id: str
    session_id: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class TelemetryEventPayload(BaseModel):
    event_id: str
    event_type: str
    timestamp: str
    data: Dict[str, Any]


class TelemetryBatchPayload(BaseModel):
    session_id: str
    age_bracket: Optional[str] = None
    events: List[TelemetryEventPayload]


class ToneMixerSentenceSet(BaseModel):
    low: str
    medium: str
    high: str


class ToneMixerMatrix(BaseModel):
    empathy: ToneMixerSentenceSet
    logic: ToneMixerSentenceSet
    directness: ToneMixerSentenceSet


class ScenarioResponse(BaseModel):
    scenario_id: str
    age_bracket: str
    inbound_message: str
    optimal_mix: Dict[str, int]
    matrix: ToneMixerMatrix


class CognitiveProfileOut(BaseModel):
    session_id: str
    score_data: Optional[Dict[str, Any]] = None
    narrative: Optional[str] = None

    model_config = {"from_attributes": True}
