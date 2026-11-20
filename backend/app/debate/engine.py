"""
Main debate orchestration engine.
Runs the full multi-agent debate: proposals → critique → validation → cost →
revision → voting → finalization → document generation.
"""

import asyncio
from datetime import datetime
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models import Session as DBSession, AgentProposal, DebateMessage, FinalArchitecture
from app.debate.agents import (
    ARCHITECT_AGENT_IDS,
    generate_proposal,
    run_devils_advocate,
    run_validation,
    run_cost_analysis,
    run_ml_analysis,
    run_sustainability_analysis,
    revise_proposal,
    run_cross_voting,
    run_finalizer,
)
from app.services.sse_publisher import SSEPublisher, remove_session_queue
from app.services.document_generator import generate_documents


async def _save_proposal(session_id: str, proposal: dict, round_num: int = 1):
    async with AsyncSessionLocal() as db:
        obj = AgentProposal(
            session_id=session_id,
            agent_id=proposal.get("agent_id", "UNKNOWN"),
            agent_name=proposal.get("agent_name", ""),
            debate_round=round_num,
            proposal_content=proposal,
            confidence_score=float(proposal.get("confidence", 0.5)),
        )
        db.add(obj)
        await db.commit()


async def _save_message(
    session_id: str,
    from_agent: str,
    msg_type: str,
    content: str,
    to_agent: str | None = None,
    meta: dict | None = None,
    seq: int = 0,
    round_num: int = 1,
):
    async with AsyncSessionLocal() as db:
        msg = DebateMessage(
            session_id=session_id,
            from_agent=from_agent,
            to_agent=to_agent,
            message_type=msg_type,
            content=content,
            metadata_json=meta or {},
            debate_round=round_num,
            sequence_num=seq,
        )
        db.add(msg)
        await db.commit()


async def _update_session(session_id: str, **kwargs):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(DBSession).where(DBSession.id == session_id))
        session = result.scalar_one_or_none()
        if session:
            for k, v in kwargs.items():
                setattr(session, k, v)
            session.updated_at = datetime.utcnow()
            await db.commit()


async def run_debate(session_id: str, project_brief: dict):
    """
    Full debate orchestration. Runs as a background asyncio task.
    All events are published via SSEPublisher.
    """
    pub = SSEPublisher(session_id)
    seq = 0

    async def emit(event_type: str, payload: dict):
        nonlocal seq
        seq += 1
        await pub.emit(event_type, payload)

    try:
        # ─── PHASE 1: Parallel Proposals ──────────────────────────────────
        await emit("phase.started", {
            "phase": "P1",
            "name": "Independent Proposals",
            "description": "All architect agents independently propose architectures",
            "agent_count": len(ARCHITECT_AGENT_IDS),
        })
        await _update_session(session_id, current_phase="P1: Parallel Proposals")

        # Run proposals in batches of 3 to stay under the 8k TPM rate limit.
        # Firing all 13 simultaneously causes 429 errors for AGENT-08 and later agents.
        BATCH_SIZE = 3
        proposals = []
        for i in range(0, len(ARCHITECT_AGENT_IDS), BATCH_SIZE):
            batch = ARCHITECT_AGENT_IDS[i:i + BATCH_SIZE]
            batch_tasks = [generate_proposal(agent_id, project_brief, pub) for agent_id in batch]
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            for p in batch_results:
                if isinstance(p, dict) and p:
                    proposals.append(p)
            # Brief pause between batches to let TPM window recover
            if i + BATCH_SIZE < len(ARCHITECT_AGENT_IDS):
                await asyncio.sleep(15)

        for p in proposals:
            await _save_proposal(session_id, p, round_num=1)
            await _save_message(
                session_id, p["agent_id"], "proposal",
                p.get("summary", ""), seq=seq, round_num=1
            )

        await emit("phase.complete", {
            "phase": "P1",
            "proposals_count": len(proposals),
        })


        # ─── PHASE 2: Devil's Advocate ────────────────────────────────────
        await emit("phase.started", {
            "phase": "P2",
            "name": "Critical Analysis",
            "description": "Devil's Advocate tears apart every proposal",
        })
        await _update_session(session_id, current_phase="P2: Devil's Advocate")

        critiques_result = await run_devils_advocate(proposals, project_brief, pub)
        critiques = [c for c in critiques_result.get("critiques", []) if isinstance(c, dict)]

        for c in critiques:
            critique_text = c.get('critique', '')
            if not isinstance(critique_text, str):
                critique_text = str(critique_text)
            await _save_message(
                session_id, "AGENT-08", "critique",
                f"[{c.get('severity', 'Major')}] {c.get('title', '')}: {critique_text}",
                to_agent=c.get("target_agent"),
                meta=c, seq=seq, round_num=1,
            )

        await emit("phase.complete", {"phase": "P2", "critiques_count": len(critiques)})

        # ─── PHASE 3: Tech Validation + Cost Analysis (parallel) ──────────
        await emit("phase.started", {
            "phase": "P3",
            "name": "Validation, Cost & Specialist Analysis",
            "description": "Tech Validator, Cost Analyst, ML Engineer & Sustainability Architect analyze all proposals",
        })
        await _update_session(session_id, current_phase="P3: Validation & Costs")

        # Run 2 specialists at a time to avoid hitting the 8k TPM rate limit
        validation_result, cost_result = await asyncio.gather(
            run_validation(proposals, project_brief, pub),
            run_cost_analysis(proposals, project_brief, pub),
        )
        await asyncio.sleep(10)
        ml_result, sustainability_result = await asyncio.gather(
            run_ml_analysis(proposals, project_brief, pub),
            run_sustainability_analysis(proposals, project_brief, pub),
        )

        await emit("phase.complete", {"phase": "P3"})

        # Give the frontend 2s to render all specialist completion cards
        # before the P4 revision wave starts flooding agent.started events
        await asyncio.sleep(2)

        # ─── PHASE 4: Parallel Revisions ──────────────────────────────────
        await emit("phase.started", {
            "phase": "P4",
            "name": "Debate & Revision",
            "description": "Agents defend, concede, and revise under pressure",
        })
        await _update_session(session_id, current_phase="P4: Debate & Revision")

        critique_by_agent = {c.get("target_agent"): c for c in critiques if isinstance(c, dict)}
        validations_list = validation_result.get("validations", []) if isinstance(validation_result, dict) else []
        validation_by_agent = {
            v.get("target_agent"): v
            for v in validations_list if isinstance(v, dict)
        }

        # Run revisions in batches of 3 to stay under the 8k TPM rate limit
        revised_proposals = []
        BATCH_SIZE = 3
        for i in range(0, len(proposals), BATCH_SIZE):
            batch = proposals[i:i + BATCH_SIZE]
            revision_tasks = [
                revise_proposal(
                    p["agent_id"], p,
                    critique_by_agent.get(p["agent_id"]),
                    validation_by_agent.get(p["agent_id"]),
                    project_brief, pub
                )
                for p in batch
            ]
            batch_revised = await asyncio.gather(*revision_tasks, return_exceptions=True)
            for r in batch_revised:
                if isinstance(r, dict) and r:
                    revised_proposals.append(r)
            if i + BATCH_SIZE < len(proposals):
                await asyncio.sleep(15)

        for r in revised_proposals:
            await _save_proposal(session_id, r, round_num=2)
            # Defensive str() — Claude can return concessions/defenses as dicts
            concessions = r.get('concessions', ['None'])
            defenses = r.get('defenses', ['Core approach'])
            c_str = ', '.join(str(x) for x in concessions) if concessions else 'None'
            d_str = ', '.join(str(x) for x in defenses) if defenses else 'Core approach'
            await _save_message(
                session_id, r["agent_id"], "revision",
                f"Concessions: {c_str}. Defended: {d_str}",
                seq=seq, round_num=2,
            )

        # Compute convergence after revisions
        avg_confidence = sum(r.get("confidence", 0.5) for r in revised_proposals) / max(len(revised_proposals), 1)
        convergence = min(avg_confidence * 1.1, 1.0)
        await _update_session(session_id, convergence_score=convergence)
        await emit("convergence.score", {"score": convergence, "round": 1})
        await emit("phase.complete", {"phase": "P4", "revised_count": len(revised_proposals)})

        # ─── PHASE 5: Cross-Voting ─────────────────────────────────────────
        await emit("phase.started", {
            "phase": "P5",
            "name": "Convergence Voting",
            "description": "Agents vote for the best components across all proposals",
        })
        await _update_session(session_id, current_phase="P5: Voting")

        votes = await run_cross_voting(revised_proposals, project_brief, pub)

        for vote in votes:
            rec = vote.get("synthesis_recommendation", "")
            await _save_message(
                session_id, vote.get("voter_agent", "UNKNOWN"), "vote",
                str(rec) if rec else "",
                seq=seq, round_num=2,
            )

        final_convergence = min(convergence * 1.15, 1.0)
        await _update_session(session_id, convergence_score=final_convergence)
        await emit("convergence.score", {"score": final_convergence, "round": 2, "converged": True})
        await emit("phase.complete", {"phase": "P5"})

        # ─── PHASE 6: Finalization ────────────────────────────────────────
        await emit("phase.started", {
            "phase": "P6",
            "name": "Synthesis & Finalization",
            "description": "Architect Finaliser synthesizes the definitive architecture",
        })
        await _update_session(session_id, current_phase="P6: Finalization")

        final_arch = await run_finalizer(
            revised_proposals, critiques_result, validation_result,
            cost_result, votes, project_brief, pub
        )

        await _save_message(
            session_id, "AGENT-13", "synthesis",
            final_arch.get("summary", ""), seq=seq, round_num=2
        )

        # ─── PHASE 7: Document Generation ────────────────────────────────
        await emit("phase.started", {
            "phase": "P7",
            "name": "Document Generation",
            "description": "Generating downloadable PDF and DOCX reports",
        })
        await _update_session(session_id, current_phase="P7: Documents")

        pdf_path, docx_path = await generate_documents(session_id, final_arch, project_brief)

        # Save final architecture to DB
        async with AsyncSessionLocal() as db:
            arch = FinalArchitecture(
                session_id=session_id,
                pattern=final_arch.get("pattern", "hybrid"),
                summary=final_arch.get("summary", ""),
                tech_stack=final_arch.get("tech_stack", {}),
                components=final_arch.get("components", []),
                adr=final_arch.get("adr", ""),
                risk_register=final_arch.get("risk_register", []),
                cost_projection=final_arch.get("cost_projection", {}),
                timeline=final_arch.get("timeline", {}),
                mermaid_diagram=final_arch.get("mermaid_diagram", ""),
                scorecard=final_arch.get("scorecard", {}),
                overall_confidence=float(final_arch.get("overall_confidence", 0.75)),
                pdf_path=pdf_path,
                docx_path=docx_path,
            )
            db.add(arch)
            await db.commit()
            await db.refresh(arch)
            arch_id = arch.id

        await _update_session(
            session_id,
            status="completed",
            current_phase="completed",
            final_architecture_id=arch_id,
        )

        await emit("document.ready", {
            "pdf_url": f"/api/files/{pdf_path}" if pdf_path else None,
            "docx_url": f"/api/files/{docx_path}" if docx_path else None,
        })

        await emit("session.completed", {
            "session_id": session_id,
            "architecture_id": arch_id,
            "pattern": final_arch.get("pattern"),
            "overall_confidence": final_arch.get("overall_confidence"),
            "summary": final_arch.get("summary"),
        })

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        await pub.emit("session.failed", {
            "session_id": session_id,
            "error": str(e),
            "traceback": tb,
        })
        await _update_session(session_id, status="failed")

    finally:
        # Give SSE clients a moment to receive the final event before cleaning up
        await asyncio.sleep(5)
        remove_session_queue(session_id)
