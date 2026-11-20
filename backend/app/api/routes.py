"""All API routes: session management, SSE streaming, file downloads."""

import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Session as DBSession, AgentProposal, DebateMessage, FinalArchitecture
from app.debate.engine import run_debate
from app.services.sse_publisher import create_session_queue, get_session_queue

router = APIRouter()
OUTPUT_DIR = Path("./output")
OUTPUT_DIR.mkdir(exist_ok=True)


# ── Schemas ──────────────────────────────────────────────────────────────────

class ProjectBrief(BaseModel):
    project_name: str
    project_description: str
    company_stage: str  # startup / scaleup / enterprise
    team_size: int
    team_skills: list[str]
    budget_monthly_usd: int
    timeline_months: int
    expected_dau_launch: int
    expected_dau_1year: int
    non_functionals: list[str]
    priority_axis: dict  # {speed: 0.7, scalability: 0.2, cost: 0.1}
    has_existing_system: bool = False
    existing_system_description: str = ""


# ── Session Endpoints ─────────────────────────────────────────────────────────

@router.post("/sessions")
async def create_session(brief: ProjectBrief, db: AsyncSession = Depends(get_db)):
    """Create a new debate session and start the background debate task."""
    session_id = str(uuid.uuid4())

    # Create DB record
    db_session = DBSession(
        id=session_id,
        project_brief=brief.model_dump(),
        status="running",
        current_phase="initializing",
    )
    db.add(db_session)
    await db.commit()

    # Create the SSE event queue
    create_session_queue(session_id)

    # Start debate as a background asyncio task (non-blocking)
    asyncio.create_task(run_debate(session_id, brief.model_dump()))

    return {"session_id": session_id, "status": "running"}


@router.get("/sessions")
async def list_sessions(db: AsyncSession = Depends(get_db)):
    """List all sessions (history)."""
    result = await db.execute(
        select(DBSession).order_by(desc(DBSession.created_at)).limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "project_name": s.project_brief.get("project_name", "Untitled"),
            "status": s.status,
            "current_phase": s.current_phase,
            "convergence_score": s.convergence_score,
            "created_at": s.created_at.isoformat(),
            "has_architecture": s.final_architecture_id is not None,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get full session data including proposals, messages, and final architecture."""
    result = await db.execute(
        select(DBSession).where(DBSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get proposals
    props_result = await db.execute(
        select(AgentProposal)
        .where(AgentProposal.session_id == session_id)
        .order_by(AgentProposal.created_at)
    )
    proposals = props_result.scalars().all()

    # Get debate messages
    msgs_result = await db.execute(
        select(DebateMessage)
        .where(DebateMessage.session_id == session_id)
        .order_by(DebateMessage.sequence_num)
    )
    messages = msgs_result.scalars().all()

    # Get final architecture
    arch = None
    if session.final_architecture_id:
        arch_result = await db.execute(
            select(FinalArchitecture).where(FinalArchitecture.session_id == session_id)
        )
        arch_obj = arch_result.scalar_one_or_none()
        if arch_obj:
            arch = {
                "id": arch_obj.id,
                "pattern": arch_obj.pattern,
                "summary": arch_obj.summary,
                "tech_stack": arch_obj.tech_stack,
                "components": arch_obj.components,
                "adr": arch_obj.adr,
                "risk_register": arch_obj.risk_register,
                "cost_projection": arch_obj.cost_projection,
                "timeline": arch_obj.timeline,
                "mermaid_diagram": arch_obj.mermaid_diagram,
                "scorecard": arch_obj.scorecard,
                "overall_confidence": arch_obj.overall_confidence,
                "pdf_url": f"/api/files/{arch_obj.pdf_path}" if arch_obj.pdf_path else None,
                "docx_url": f"/api/files/{arch_obj.docx_path}" if arch_obj.docx_path else None,
            }

    return {
        "id": session.id,
        "project_brief": session.project_brief,
        "status": session.status,
        "current_phase": session.current_phase,
        "convergence_score": session.convergence_score,
        "created_at": session.created_at.isoformat(),
        "proposals": [
            {
                "id": p.id,
                "agent_id": p.agent_id,
                "agent_name": p.agent_name,
                "debate_round": p.debate_round,
                "content": p.proposal_content,
                "confidence": p.confidence_score,
            }
            for p in proposals
        ],
        "messages": [
            {
                "id": m.id,
                "from_agent": m.from_agent,
                "to_agent": m.to_agent,
                "type": m.message_type,
                "content": m.content,
                "round": m.debate_round,
                "seq": m.sequence_num,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
        "architecture": arch,
    }


# ── SSE Stream ────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/stream")
async def stream_session(session_id: str, request: Request):
    """SSE endpoint — streams live debate events for a running session."""
    from app.db.database import AsyncSessionLocal

    # Initial check to see if session is historical or live
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(DBSession).where(DBSession.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        is_historical = session.status in ("completed", "failed")

    if is_historical:
        async def stream_historical() -> AsyncGenerator[str, None]:
            # Each generator needs its own session to avoid lifecycle issues with StreamingResponse
            async with AsyncSessionLocal() as hist_db:
                msgs_result = await hist_db.execute(
                    select(DebateMessage)
                    .where(DebateMessage.session_id == session_id)
                    .order_by(DebateMessage.sequence_num)
                )
                messages = msgs_result.scalars().all()
                for msg in messages:
                    event = {
                        "type": "historical." + msg.message_type,
                        "payload": {
                            "from_agent": msg.from_agent,
                            "to_agent": msg.to_agent,
                            "content": msg.content,
                            "round": msg.debate_round,
                        },
                        "session_id": session_id,
                    }
                    yield f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"
                    await asyncio.sleep(0.01)

                # Send final completion event
                arch_result = await hist_db.execute(
                    select(FinalArchitecture).where(FinalArchitecture.session_id == session_id)
                )
                arch = arch_result.scalar_one_or_none()
                yield (
                    f"event: session.completed\n"
                    f"data: {json.dumps({'type': 'session.completed', 'payload': {'session_id': session_id, 'architecture_id': arch.id if arch else None}, 'session_id': session_id})}\n\n"
                )

        return StreamingResponse(
            stream_historical(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # Live session — read from asyncio.Queue
    async def event_generator() -> AsyncGenerator[str, None]:
        queue = get_session_queue(session_id)
        if queue is None:
            yield f"event: session.failed\ndata: {json.dumps({'type': 'session.failed', 'payload': {'error': 'Queue not found'}, 'session_id': session_id})}\n\n"
            return

        heartbeat_interval = 15.0
        while True:
            if await request.is_disconnected():
                break

            try:
                event = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                event_type = event.get("type", "message")
                yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"

                if event_type in ("session.completed", "session.failed"):
                    break

            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ── File Downloads ─────────────────────────────────────────────────────────────

@router.get("/files/{filename}")
async def download_file(filename: str):
    """Serve generated PDF/DOCX files."""
    # Security: only allow filenames without path traversal
    filename = Path(filename).name
    filepath = OUTPUT_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")

    media_type = "application/pdf" if filename.endswith(".pdf") else \
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return FileResponse(
        path=str(filepath),
        media_type=media_type,
        filename=filename,
    )
