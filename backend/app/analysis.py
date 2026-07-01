import os
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from . import models


def load_session_events(db: Session, session_id: str) -> pd.DataFrame:
    events = db.query(models.TelemetryEvent).filter(models.TelemetryEvent.session_id == session_id).all()
    if not events:
        return pd.DataFrame([])

    rows = [
        {
            'event_type': event.event_type,
            'event_timestamp': event.event_timestamp,
            'data': event.data,
        }
        for event in events
    ]
    return pd.DataFrame(rows)


AGE_BRACKET_PARAMS = {
    '11-14': {'temporal_buffer': 1.5, 'working_memory_load': 0.7},
    '15-24': {'temporal_buffer': 1.0, 'working_memory_load': 1.0},
    '25-64': {'temporal_buffer': 1.0, 'working_memory_load': 1.2},
    '65+':  {'temporal_buffer': 1.8, 'working_memory_load': 1.5},
}


def compute_emotional_intelligence_from_tone_mixer(df, event_counts):
    tone_events = df[df['event_type'] == 'tone_mixer.send'].sort_values('event_timestamp')
    if tone_events.empty:
        return min(100, 20 + event_counts.get('moduleB.slider', 0) * 5 + event_counts.get('moduleB.message', 0) * 8)

    from math import sqrt
    scores = []
    for _, row in tone_events.iterrows():
        data = row.get('data', {})
        metrics = data.get('metrics', {})
        final = metrics.get('final_mix', {})
        optimal = metrics.get('optimal_mix', {})
        if final and optimal:
            dist = sqrt(
                (final.get('empathy', 50) - optimal.get('empathy', 50)) ** 2
                + (final.get('logic', 50) - optimal.get('logic', 50)) ** 2
                + (final.get('directness', 50) - optimal.get('directness', 50)) ** 2
            )
            proximity = max(0, min(100, 100 - dist * 0.6))
            regret_bonus = min(20, metrics.get('draft_regret_count', 0) * 10)
            bias_bonus = 5 if metrics.get('empathy_bias') else 0
            scores.append(min(100, proximity + regret_bonus + bias_bonus))

    if scores:
        ei = sum(scores) // len(scores)
        return min(100, ei)

    return min(100, 20 + event_counts.get('moduleB.slider', 0) * 5 + event_counts.get('moduleB.message', 0) * 8)


def _extract_score(df, event_type, field, fallback):
    events = df[df['event_type'] == event_type]
    if events.empty:
        return fallback
    vals = [row['data'].get(field, fallback) for _, row in events.iterrows()]
    return max(0, min(100, sum(vals) // len(vals)))


def compute_creativity_from_alchemist(df, event_counts):
    return _extract_score(df, 'alchemist.complete', 'creativity_score',
                          min(100, 20 + event_counts.get('module.interact', 0) * 10))


def compute_social_cognition_from_trust(df, event_counts):
    return _extract_score(df, 'trust.complete', 'social_cognition_score',
                          min(100, 20 + event_counts.get('moduleB.message', 0) * 4))


def compute_decision_making_from_fog(df, event_counts):
    return _extract_score(df, 'fog.complete', 'fog_score',
                          min(100, 20 + max(0, len(df) - 4) * 3))


def compute_metacognition_from_calibrator(df, event_counts):
    return _extract_score(df, 'calibrator.complete', 'metacognition_score',
                          min(100, 20 + event_counts.get('circuit.final.simulate', 0) * 10 + event_counts.get('timelapse.order', 0) * 8))


def score_session(session_id: str, db: Session) -> dict[str, Any]:
    df = load_session_events(db, session_id)
    if df.empty:
        return {
            'attention_focus': 0,
            'memory': 0,
            'reasoning': 0,
            'problem_solving': 0,
            'executive_functions': 0,
            'creativity': 0,
            'emotional_intelligence': 0,
            'social_cognition': 0,
            'decision_making': 0,
            'metacognition': 0,
        }

    event_counts = df['event_type'].value_counts().to_dict()

    attention_focus = min(100, 20 + event_counts.get('signal.click', 0) * 3 + event_counts.get('signal.alarm.sequence', 0) * 10 + event_counts.get('signal.complete', 0) * 10)

    reconstruct_events = df[df['event_type'] == 'timelapse.reconstruct']
    if not reconstruct_events.empty:
        avg_accuracy = reconstruct_events['data'].apply(lambda d: d.get('accuracy', 0)).mean()
        avg_distance = reconstruct_events['data'].apply(lambda d: d.get('distanceScore', 0)).mean()
        avg_efficiency = reconstruct_events['data'].apply(lambda d: d.get('correctionEfficiency', 0)).mean()
        memory = min(100, int(avg_accuracy * 50 + avg_distance * 0.3 + avg_efficiency * 0.2))
    else:
        memory = min(100, 20 + event_counts.get('timelapse.order', 0) * 20 + event_counts.get('timelapse.complete', 0) * 15)
    reasoning = min(100, 20 + event_counts.get('circuit.pulse.fire', 0) * 2 + event_counts.get('circuit.pulse.result', 0) * 3 + event_counts.get('circuit.final.simulate', 0) * 20 + event_counts.get('circuit.complete', 0) * 15)
    problem_solving = min(100, 20 + event_counts.get('cascade.reroute', 0) * 4 + event_counts.get('cascade.complete', 0) * 20)
    executive_functions = min(100, 20 + event_counts.get('dispatcher.taskAction', 0) * 3 + event_counts.get('dispatcher.complete', 0) * 20)
    creativity = compute_creativity_from_alchemist(df, event_counts)
    emotional_intelligence = compute_emotional_intelligence_from_tone_mixer(df, event_counts)
    social_cognition = compute_social_cognition_from_trust(df, event_counts)
    decision_making = compute_decision_making_from_fog(df, event_counts)
    metacognition = compute_metacognition_from_calibrator(df, event_counts)

    session = db.query(models.AssessmentSession).filter_by(session_id=session_id).first()
    age_bracket = session.age_bracket if session else None
    bracket = AGE_BRACKET_PARAMS.get(age_bracket, AGE_BRACKET_PARAMS['15-24'])
    temporal_buffer = bracket['temporal_buffer']
    working_memory_load = bracket['working_memory_load']

    reasoning = min(100, int(reasoning / temporal_buffer))
    memory = min(100, int(memory / working_memory_load))
    decision_making = min(100, int(decision_making * (1 + (1 - working_memory_load) * 0.3)))
    attention_focus = min(100, int(attention_focus * (1 + (1 - temporal_buffer) * 0.2)))

    return {
        'attention_focus': attention_focus,
        'memory': memory,
        'reasoning': reasoning,
        'problem_solving': problem_solving,
        'executive_functions': executive_functions,
        'creativity': creativity,
        'emotional_intelligence': emotional_intelligence,
        'social_cognition': social_cognition,
        'decision_making': decision_making,
        'metacognition': metacognition,
        'event_counts': event_counts,
        'age_bracket': age_bracket,
    }


def generate_narrative(score_data: dict[str, Any]) -> str:
    if os.getenv('GOOGLE_API_KEY'):
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
            prompt = (
                'You are a cognitive analyst. Create a "Cognitive Twin" narrative (3-5 sentences) '
                'based on these scores and event counts. Describe the user\'s thinking style, '
                'strengths, and areas for growth. Scores:\n'
                f'{score_data}'
            )
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            return response.text if hasattr(response, 'text') else str(response)
        except Exception:
            pass

    return (
        'The user demonstrates a methodical thinking style with a strong weight on logic and focus. '
        'Emotional perception remains balanced, while risk tolerance is moderate. '
        'This profile was generated from the first telemetry events of the session.'
    )


def build_cognitive_profile(session_id: str, db: Session) -> models.CognitiveProfile:
    scores = score_session(session_id, db)
    narrative = generate_narrative(scores)
    profile = db.query(models.CognitiveProfile).filter(models.CognitiveProfile.session_id == session_id).first()
    if not profile:
        profile = models.CognitiveProfile(session_id=session_id, score_data=scores, narrative=narrative)
        db.add(profile)
    else:
        profile.score_data = scores
        profile.narrative = narrative
    db.commit()
    db.refresh(profile)
    return profile
