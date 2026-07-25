"""
Database Layer & Session Persistence Module for Retail Bank Customer Segmentation.

Provides SQLAlchemy database initialization, session management, and CRUD helpers
for Session history, Message logging, Segment Caching, and Trace Logging.
"""

import json
import os
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Dict, Any, List, Optional, Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from backend.config import DEFAULT_ADV_MODEL, DEFAULT_MYRA_MODEL
from backend.db.models import Base, SessionModel, MessageModel, SegmentCacheModel, TraceLogModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_APP_DB_PATH = BASE_DIR / "datasets" / "bank_sqlite.db"


def get_app_db_path(custom_path: Optional[str | Path] = None) -> Path:
    """Resolve Path object for application SQLite database."""
    if custom_path:
        return Path(custom_path).resolve()
    env_path = os.getenv("APP_DB_PATH") or os.getenv("BANK_DB_PATH")
    if env_path:
        return Path(env_path).resolve()
    return DEFAULT_APP_DB_PATH.resolve()


def get_database_url(db_path: Optional[str | Path] = None) -> str:
    """Return SQLAlchemy database connection URL string."""
    target_path = get_app_db_path(db_path)
    # Ensure parent directory exists
    target_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{target_path}"


def create_db_engine(db_path: Optional[str | Path] = None):
    """Create SQLAlchemy engine with thread-safe settings for SQLite."""
    url = get_database_url(db_path)
    return create_engine(
        url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )


# Default engine & session maker instance
engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db(db_path: Optional[str | Path] = None) -> None:
    """Initialize database tables for application models."""
    target_engine = create_db_engine(db_path) if db_path else engine
    Base.metadata.create_all(bind=target_engine)


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager providing a transactional database session."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ── PERSISTENCE HELPER FUNCTIONS ───────────────────────────────────────────────

def create_session(
    session_id: Optional[str] = None,
    title: Optional[str] = None,
    advait_model: str = DEFAULT_ADV_MODEL,
    myra_model: str = DEFAULT_MYRA_MODEL,
    state_data: Optional[Dict[str, Any]] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Create and persist a new user chat session.
    """
    sid = session_id or str(uuid.uuid4())
    serialized_state = json.dumps(state_data) if state_data else None

    def _execute(s: Session):
        session_obj = s.query(SessionModel).filter(SessionModel.id == sid).first()
        if not session_obj:
            session_obj = SessionModel(
                id=sid,
                title=title or f"Session {sid[:8]}",
                advait_model=advait_model,
                myra_model=myra_model,
                state_data=serialized_state,
            )
            s.add(session_obj)
        else:
            if title:
                session_obj.title = title
            if advait_model:
                session_obj.advait_model = advait_model
            if myra_model:
                session_obj.myra_model = myra_model
            if serialized_state:
                session_obj.state_data = serialized_state
        s.flush()
        return {
            "id": session_obj.id,
            "title": session_obj.title,
            "advait_model": session_obj.advait_model,
            "myra_model": session_obj.myra_model,
            "created_at": session_obj.created_at.isoformat() if session_obj.created_at else None,
        }


    if db:
        return _execute(db)
    with get_db_session() as s:
        return _execute(s)


def get_session(session_id: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
    """Retrieve session details by session_id."""
    def _execute(s: Session):
        session_obj = s.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session_obj:
            return None
        return {
            "id": session_obj.id,
            "title": session_obj.title,
            "advait_model": session_obj.advait_model,
            "myra_model": session_obj.myra_model,
            "created_at": session_obj.created_at.isoformat() if session_obj.created_at else None,
            "updated_at": session_obj.updated_at.isoformat() if session_obj.updated_at else None,
        }

    if db:
        return _execute(db)
    with get_db_session() as s:
        return _execute(s)


def update_session_models(
    session_id: str,
    advait_model: Optional[str] = None,
    myra_model: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """Update selected model configuration for a given session."""
    def _execute(s: Session):
        session_obj = s.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session_obj:
            session_obj = SessionModel(
                id=session_id,
                title=f"Session {session_id[:8]}",
                advait_model=advait_model or DEFAULT_ADV_MODEL,
                myra_model=myra_model or DEFAULT_MYRA_MODEL,
            )
            s.add(session_obj)
        else:
            if advait_model:
                session_obj.advait_model = advait_model
            if myra_model:
                session_obj.myra_model = myra_model
        s.flush()
        return {
            "id": session_obj.id,
            "title": session_obj.title,
            "advait_model": session_obj.advait_model,
            "myra_model": session_obj.myra_model,
        }

    if db:
        return _execute(db)
    with get_db_session() as s:
        return _execute(s)



def save_message(
    session_id: str,
    role: str,
    content: str,
    agent_name: Optional[str] = None,
    extra_data: Optional[Dict[str, Any]] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Save a chat message (user, assistant, or agent output) to a session.
    """
    serialized_extra = json.dumps(extra_data) if extra_data else None

    def _execute(s: Session):
        # Ensure session exists
        session_obj = s.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session_obj:
            session_obj = SessionModel(
                id=session_id,
                title=f"Session {session_id[:8]}",
                advait_model=DEFAULT_ADV_MODEL,
                myra_model=DEFAULT_MYRA_MODEL,
            )
            s.add(session_obj)
            s.flush()

        msg = MessageModel(
            session_id=session_id,
            role=role,
            agent_name=agent_name,
            content=content,
            extra_data=serialized_extra,
        )
        s.add(msg)
        s.flush()
        return {
            "id": msg.id,
            "session_id": msg.session_id,
            "role": msg.role,
            "agent_name": msg.agent_name,
            "content": msg.content,
            "extra_data": extra_data,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        }

    if db:
        return _execute(db)
    with get_db_session() as s:
        return _execute(s)


def get_session_history(
    session_id: str,
    limit: Optional[int] = None,
    db: Optional[Session] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve message history for a given session ID.
    """
    def _execute(s: Session):
        query = s.query(MessageModel).filter(MessageModel.session_id == session_id).order_by(MessageModel.created_at.asc())
        if limit and limit > 0:
            query = query.limit(limit)

        messages = query.all()
        result = []
        for m in messages:
            extra = json.loads(m.extra_data) if m.extra_data else None
            result.append({
                "id": m.id,
                "session_id": m.session_id,
                "role": m.role,
                "agent_name": m.agent_name,
                "content": m.content,
                "extra_data": extra,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            })
        return result

    if db:
        return _execute(db)
    with get_db_session() as s:
        return _execute(s)


def cache_segment_results(
    session_id: str,
    method: str,
    features: List[str],
    assignments: Any,
    stats: Dict[str, Any],
    metrics: Dict[str, Any],
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Cache segmentation run outputs to database.
    """
    cache_id = str(uuid.uuid4())

    def _execute(s: Session):
        record = SegmentCacheModel(
            id=cache_id,
            session_id=session_id,
            segmentation_method=method,
            features_used=json.dumps(features),
            segment_assignments=json.dumps(assignments),
            segment_stats=json.dumps(stats),
            evaluation_metrics=json.dumps(metrics),
        )
        s.add(record)
        s.flush()
        return {
            "id": record.id,
            "session_id": record.session_id,
            "segmentation_method": record.segmentation_method,
            "features_used": features,
            "created_at": record.created_at.isoformat() if record.created_at else None,
        }

    if db:
        return _execute(db)
    with get_db_session() as s:
        return _execute(s)


def log_trace(
    session_id: str,
    conversation_id: str,
    agent_name: str,
    event_type: str,
    input_data: Any = None,
    output_data: Any = None,
    latency_ms: float = 0.0,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Log an agent execution event or tool call trace to database.
    """
    def _execute(s: Session):
        trace = TraceLogModel(
            session_id=session_id,
            conversation_id=conversation_id,
            agent_name=agent_name,
            event_type=event_type,
            input_data=json.dumps(input_data) if input_data is not None else None,
            output_data=json.dumps(output_data) if output_data is not None else None,
            latency_ms=latency_ms,
        )
        s.add(trace)
        s.flush()
        return {
            "id": trace.id,
            "session_id": trace.session_id,
            "agent_name": trace.agent_name,
            "event_type": trace.event_type,
            "latency_ms": trace.latency_ms,
            "timestamp": trace.timestamp.isoformat() if trace.timestamp else None,
        }

    if db:
        return _execute(db)
    with get_db_session() as s:
        return _execute(s)
