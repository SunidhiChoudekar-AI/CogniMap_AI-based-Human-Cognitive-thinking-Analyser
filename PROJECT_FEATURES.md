# CogniMap — AI-Powered Human Cognitive Pattern Analyzer

> **Purpose:** Tracks thousands of split-second behavioral patterns via interactive micro-environments (modules) to map a user's "Cognitive Twin" — a detailed profile of their thinking style, strengths, and areas for growth across 10 cognitive dimensions.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Authentication & User Management](#authentication--user-management)
- [Telemetry System](#telemetry-system)
- [Cognitive Assessment Modules](#cognitive-assessment-modules)
- [Age Bracket Adaptation](#age-bracket-adaptation)
- [Cognitive Profile & Reporting](#cognitive-profile--reporting)
- [Theme System](#theme-system)
- [API Routes](#api-routes)
- [Database Schema](#database-schema)
- [Scoring Engine](#scoring-engine)
- [Deployment](#deployment)

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.14** | Runtime |
| **FastAPI** | Web framework with automatic OpenAPI docs |
| **SQLAlchemy** | ORM for database access |
| **Pydantic** | Request/response validation |
| **pandas** | Data analysis for telemetry processing |
| **google-generativeai** | Gemini AI integration for narrative generation |
| **google-auth / PyJWT** | Google OAuth verification and JWT signing |
| **PostgreSQL / SQLite** | Database (PostgreSQL in Docker, SQLite fallback) |
| **uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite 5** | Build tool and dev server |
| **React Router DOM 6** | Client-side routing |
| **Tailwind CSS 3** | Utility-first CSS with custom design tokens |
| **Recharts 2** | Radar charts and data visualization |
| **react-dnd** | Drag-and-drop (TimeLapseRoom, CircuitWeaver, Dispatcher, ObjectAlchemist) |
| **Axios** | HTTP client for API calls |
| **@react-oauth/google** | Google OAuth button component |
| **lucide-react** | Icon library |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker Compose** | Multi-container orchestration (PostgreSQL + backend + frontend) |

---

## Architecture

```
┌──────────────┐     HTTP/JSON      ┌──────────────┐     SQL      ┌──────────┐
│   Frontend   │ ──────────────────> │   Backend    │ ───────────> │  Database │
│  (React/Vite)│ <────────────────── │  (FastAPI)   │ <─────────── │ (PG/SQLite)│
└──────────────┘     JWT Auth        └──────────────┘              └──────────┘
       │                                    │
       │  Telemetry (batched every 5s)      │  Google Gemini AI
       └────────────────────────────────────┘       │
                                                    ▼
                                           AI Narrative Generation
```

---

## Authentication & User Management

| Feature | Description |
|---|---|
| **Google OAuth Sign-In** | Sign in with Google account via `@react-oauth/google`. Backend verifies the Google token and creates/looks up a user. |
| **Email Sign-In** | Authenticate with just an email address (no password — lightweight auth). |
| **Guest Access** | Continue as a guest. A unique 12-character hex Guest ID is generated and displayed — users can save it to log back in later. |
| **Guest Login** | Returning guests re-authenticate using their saved Guest ID. |
| **JWT Token Management** | All auth methods return a signed JWT (HS256) stored in `localStorage`. |
| **Session Linking** | Assessment sessions can be linked to user accounts on login. |

---

## Telemetry System

| Feature | Description |
|---|---|
| **High-Frequency Event Logging** | Every user interaction within modules is logged as a telemetry event with a unique ID, timestamp, event type, and data payload. |
| **Telemetry Buffering** | Events are queued in-memory and flushed to the backend in batches every 5 seconds. |
| **Event Categories** | `signal.click`, `signal.alarm.sequence`, `signal.complete`, `timelapse.order`, `timelapse.reconstruct`, `tone_mixer.send`, `circuit.pulse.fire`, `circuit.prism.place`, `cascade.reroute`, `dispatcher.taskAction`, `alchemist.combine`, `trust.wager`, `fog.probe`, `calibrator.answer`, `module.open`, `auth.*`, etc. |

---

## Cognitive Assessment Modules

### 1. Signal Calibrator — Attention & Focus
- Click on a rogue red blip moving among normal blips on a radar canvas
- Static noise increases over time (attention decay)
- Secondary alarm sequence tests **divided attention** — memorize and recall a number sequence

### 2. Time-Lapse Room — Memory
- A detailed SVG room evolves through time jumps (5 states)
- Observe changes to objects (laptop, mug, plants, blanket, garland)
- Reconstruct the chronological order by drag-and-dropping room snapshots into timeline slots

### 3. Circuit Weaver — Reasoning
- Grid-based puzzle: place prism blocks (drag-and-drop) to route a light beam from start to target
- Hidden cell effects (color-shift, reflect, absorb, color-lock) discovered through test pulses
- Two phases: **inductive** (experiment) and **deductive** (final solve)

### 4. Cascade Pipeline — Problem Solving
- Grid with a pipeline path where nodes **overheat** over time
- Click overheating nodes to reroute the energy path, preventing system failure
- Animated energy pulses visualize flow

### 5. Dispatcher — Executive Functions
- Multitasking module: battery drains over time
- Juggle 2-3 concurrent tasks:
  - Sort blocks by color
  - Solve math problems
  - Match words to categories
- Bonus multipliers appear periodically

### 6. Tone Mixer — Emotional Intelligence
- Adjust three sliders (Empathy, Logic, Directness) to compose the perfect reply to a social conflict scenario
- Backend provides scenario data per age bracket
- Optimal mix compared against user's final mix
- **Draft regret** tracked (large slider adjustments)

### 7. Object Alchemist — Creativity
- Drag objects (rope, wheel, magnet, etc.) into a combiner (max 3)
- Describe how the invention solves a given creative challenge
- Multiple rounds per age group

### 8. Trust Wager — Social Cognition
- Prisoner's dilemma-style game: choose "Share" or "Keep" against an AI opponent
- AI strategy varies by age group (forgiveness, probe chance)
- After each round, users rate their confidence

### 9. Fog of War — Decision Making
- Grid of hidden cells: probe for resources and treasures while avoiding traps
- Hitting 3 traps ends the game
- Users can "bank" their score early
- Tests risk/reward decision-making under uncertainty

### 10. Confidence Calibrator — Metacognition
- Quiz with age-appropriate trivia questions
- Answer each question and rate confidence (0–100%)
- Compares confidence vs. accuracy to compute calibration score
- Detects overconfidence/underconfidence bias

---

## Age Bracket Adaptation

All modules adapt difficulty, complexity, speed, and content based on age brackets:

| Bracket | Label | Characteristics |
|---|---|---|
| **11–14** | Young Teens | Simpler, slower, fewer options |
| **15–24** | Teens/Young Adults | Standard difficulty |
| **25–64** | Adults | Harder, faster, more complexity |
| **65+** | Seniors | Slower, more forgiving, lower cognitive load |

---

## Cognitive Profile & Reporting

| Feature | Description |
|---|---|
| **Heuristic Scoring Engine** | Backend analyzes telemetry events to compute 10 cognitive dimension scores (0–100). |
| **Age-Adjusted Scoring** | Scores adjusted using age-bracket parameters (`temporal_buffer`, `working_memory_load`). |
| **AI-Generated Narrative** | If Google Gemini API key is configured, generates a 3–5 sentence "Cognitive Twin" narrative. Static fallback otherwise. |
| **Radar Chart Visualization** | Recharts radar chart of the 10 cognitive dimension scores (Dashboard + Report pages). |
| **Micro-Reports** | Each module shows an immediate post-completion micro-report with key metrics. |
| **Session Persistence** | All telemetry data stored in the database, linked to a session ID. |

---

## Theme System

- **Light/Dark Mode**: Toggle via button on Dashboard, persists in `localStorage`
- **Custom CSS Variables**: `--color-canvas`, `--color-deep-slate`, `--color-mind-teal`, `--color-insight-yellow`, `--color-creativity-pink`, `--color-warm-coral`
- **Background Images**: Thematic backgrounds change between light and dark modes

---

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/` | Root health check |
| GET | `/api/module/tone-mixer/scenario?age_bracket=` | Get Tone Mixer scenario |
| POST | `/api/auth/google` | Google OAuth sign-in |
| POST | `/api/auth/email` | Email sign-in |
| POST | `/api/auth/guest/create` | Create guest user |
| POST | `/api/auth/guest/login` | Login with guest ID |
| POST | `/api/telemetry/batch` | Ingest batch of telemetry events |
| GET | `/api/profile/{session_id}` | Get/build cognitive profile |

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | Integer | PK |
| google_id | String, nullable | Unique, indexed |
| guest_id | String, nullable | Unique, indexed |
| email | String | Unique, indexed, default `''` |
| full_name | String, nullable | |
| is_guest | Integer | Default 0 |
| created_at | DateTime | Server default now() |

### `assessment_sessions`
| Column | Type | Notes |
|---|---|---|
| id | Integer | PK |
| session_id | String | Unique, indexed, not null |
| user_id | Integer, nullable | FK → users.id |
| age_bracket | String, nullable | |
| created_at | DateTime | Server default now() |

### `module_runs`
| Column | Type | Notes |
|---|---|---|
| id | Integer | PK |
| session_id | String | FK → assessment_sessions.session_id |
| module_key | String | not null |
| result | JSON, nullable | |
| created_at | DateTime | Server default now() |

### `telemetry_events`
| Column | Type | Notes |
|---|---|---|
| id | Integer | PK |
| session_id | String | FK, indexed, not null |
| event_type | String | not null |
| event_timestamp | String | not null |
| data | JSON | not null |
| created_at | DateTime | Server default now() |

### `cognitive_profiles`
| Column | Type | Notes |
|---|---|---|
| id | Integer | PK |
| session_id | String | FK, unique, indexed, not null |
| score_data | JSON, nullable | Ten cognitive dimension scores |
| narrative | Text, nullable | AI-generated or fallback narrative |
| created_at | DateTime | Server default now() |

---

## Scoring Engine

10 cognitive dimensions computed on a 0–100 scale from telemetry:

| Dimension | Source Module | Key Metrics |
|---|---|---|
| `attention_focus` | Signal Calibrator | Rogue click count, alarm sequence recall, time-based decay |
| `memory` | Time-Lapse Room | Chronology accuracy, distance score, correction efficiency |
| `reasoning` | Circuit Weaver | Pulse count, prism moves, isolation ratio, deductive hesitation |
| `problem_solving` | Cascade Pipeline | Reroute count, final system stability score |
| `executive_functions` | Dispatcher | Task completion score, battery management |
| `creativity` | Object Alchemist | Objects used, word count, unique object diversity |
| `emotional_intelligence` | Tone Mixer | Proximity to optimal mix, draft regret count, empathy bias |
| `social_cognition` | Trust Wager | Cooperation rate, reciprocity score, score efficiency |
| `decision_making` | Fog of War | Points earned, probes used, early banking, trap avoidance |
| `metacognition` | Confidence Calibrator | Calibration accuracy, over/underconfidence bias, consistency |

---

## Deployment

### Docker Compose
```bash
docker compose up --build
```
Three services: `db` (PostgreSQL 15 Alpine), `backend` (Python 3.14), `frontend` (Node 20 Alpine).

### Local Development (Windows)
```bash
start.bat
```
Opens two cmd windows: one for backend (`uvicorn app.main:app --reload`) and one for frontend (`npm run dev`).

### Environment Variables

**Backend (`.env`)**
| Variable | Default |
|---|---|
| `DATABASE_URL` | `sqlite:///./cognimap.db` |
| `GOOGLE_API_KEY` | (empty) |
| `GOOGLE_CLIENT_ID` | (empty) |
| `SECRET_KEY` | `cognimap-dev-secret-change-in-production` |

**Frontend (`.env`)**
| Variable | Default |
|---|---|
| `VITE_API_URL` | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | (empty) |
