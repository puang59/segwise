"""
SQLAlchemy Database Models for Session History, Message Log, Segment Cache, and Trace Log.
"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class SessionModel(Base):
    """Stores user chat session metadata and current state snapshot."""
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True)
    title = Column(String(255), default="New Customer Segmentation Session")
    advait_model = Column(String(100), nullable=False)
    myra_model = Column(String(100), nullable=False)
    state_data = Column(Text, nullable=True)  # JSON serialized state
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = relationship("MessageModel", back_populates="session", cascade="all, delete-orphan")
    segment_caches = relationship("SegmentCacheModel", back_populates="session", cascade="all, delete-orphan")


class MessageModel(Base):
    """Stores individual user and assistant messages per session."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" | "assistant" | "system"
    agent_name = Column(String(50), nullable=True)  # e.g., "myra", "advait"
    content = Column(Text, nullable=False)
    extra_data = Column(Text, nullable=True)  # JSON serialized charts, follow-ups, thinking logs
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    session = relationship("SessionModel", back_populates="messages")


class SegmentCacheModel(Base):
    """Stores cached customer segmentation clustering run results."""
    __tablename__ = "segment_caches"

    id = Column(String(36), primary_key=True)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False, index=True)
    segmentation_method = Column(String(50), nullable=False)  # "rule" | "kmeans" | "hdbscan" | "gmm"
    features_used = Column(Text, nullable=False)  # JSON list of feature names
    segment_assignments = Column(Text, nullable=False)  # JSON object or list of assignments
    segment_stats = Column(Text, nullable=False)  # JSON object of segment metrics
    evaluation_metrics = Column(Text, nullable=True)  # JSON object of silhouette, inertia, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    session = relationship("SessionModel", back_populates="segment_caches")


class TraceLogModel(Base):
    """Audit log tracking agent execution events, tool calls, and latencies."""
    __tablename__ = "trace_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), nullable=False, index=True)
    conversation_id = Column(String(36), nullable=False, index=True)
    agent_name = Column(String(50), nullable=False)
    event_type = Column(String(50), nullable=False)  # "start", "end", "tool_call", "error"
    input_data = Column(Text, nullable=True)  # JSON input
    output_data = Column(Text, nullable=True)  # JSON output
    latency_ms = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)
