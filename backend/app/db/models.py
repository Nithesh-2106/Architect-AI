import uuid
from datetime import datetime
from sqlalchemy import String, Text, Float, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.db.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    project_brief: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="running")  # running/completed/failed
    current_phase: Mapped[str] = mapped_column(String(64), default="initializing")
    convergence_score: Mapped[float] = mapped_column(Float, default=0.0)
    final_architecture_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    proposals: Mapped[list["AgentProposal"]] = relationship("AgentProposal", back_populates="session")
    messages: Mapped[list["DebateMessage"]] = relationship("DebateMessage", back_populates="session")
    architecture: Mapped["FinalArchitecture | None"] = relationship("FinalArchitecture", back_populates="session", uselist=False)


class AgentProposal(Base):
    __tablename__ = "agent_proposals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"))
    agent_id: Mapped[str] = mapped_column(String(16))
    agent_name: Mapped[str] = mapped_column(String(64))
    debate_round: Mapped[int] = mapped_column(Integer, default=1)
    proposal_content: Mapped[dict] = mapped_column(JSON)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.5)
    votes_received: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active/revised/eliminated
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["Session"] = relationship("Session", back_populates="proposals")


class DebateMessage(Base):
    __tablename__ = "debate_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"))
    from_agent: Mapped[str] = mapped_column(String(16))
    to_agent: Mapped[str | None] = mapped_column(String(16), nullable=True)
    message_type: Mapped[str] = mapped_column(String(32))  # proposal/critique/revision/vote/synthesis/system
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    debate_round: Mapped[int] = mapped_column(Integer, default=1)
    sequence_num: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["Session"] = relationship("Session", back_populates="messages")


class FinalArchitecture(Base):
    __tablename__ = "architectures"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"), unique=True)
    pattern: Mapped[str] = mapped_column(String(64))
    summary: Mapped[str] = mapped_column(Text)
    tech_stack: Mapped[dict] = mapped_column(JSON)
    components: Mapped[list] = mapped_column(JSON)
    adr: Mapped[str] = mapped_column(Text)
    risk_register: Mapped[list] = mapped_column(JSON)
    cost_projection: Mapped[dict] = mapped_column(JSON)
    timeline: Mapped[dict] = mapped_column(JSON)
    mermaid_diagram: Mapped[str] = mapped_column(Text)
    scorecard: Mapped[dict] = mapped_column(JSON)
    overall_confidence: Mapped[float] = mapped_column(Float)
    pdf_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    docx_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["Session"] = relationship("Session", back_populates="architecture")
