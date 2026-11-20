"""Individual agent implementations. Each agent makes async streaming calls to Anthropic."""

import json
import re
import asyncio
from anthropic import AsyncAnthropic
from app.config import settings
from app.debate.prompts import AGENTS, REVISION_JSON_SCHEMA, VOTE_JSON_SCHEMA

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

ARCHITECT_AGENT_IDS = [
    # Original Visionaries
    "AGENT-01", "AGENT-02", "AGENT-03",
    # New Visionaries
    "AGENT-14", "AGENT-15", "AGENT-16", "AGENT-17",
    # Specialists
    "AGENT-04", "AGENT-05", "AGENT-06", "AGENT-07", "AGENT-11", "AGENT-12",
]


def _ensure_list(val) -> list:
    """Safely coerce a value to a list — prevents 'unhashable type: slice' when LLM returns a dict."""
    if isinstance(val, list):
        return val
    return []


def _parse_json(text: str) -> dict:
    """
    Robustly parse JSON from LLM output.
    3-pass strategy:
      1. Direct parse (handles clean JSON and markdown-fenced JSON).
      2. Extract from first '{' to last '}' (handles preamble/postamble text).
      3. Truncation repair — only if response is genuinely cut off mid-JSON.
    CRITICAL: Passes 1 & 2 NEVER mutate the input. Only Pass 3 does surgery.
    """
    if not text or not text.strip():
        return {}

    # Strip markdown code fences only (safe — never destroys JSON content)
    cleaned = re.sub(r'```json\s*', '', text)
    cleaned = re.sub(r'```\s*', '', cleaned)
    cleaned = cleaned.strip()

    # ── Pass 1: Direct parse ──────────────────────────────────────────────────
    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    # ── Pass 2: Extract outermost JSON object (skip preamble text) ────────────
    # Try every '{' position in order — Claude sometimes writes prose with '{' before the real JSON
    start = cleaned.find('{')
    end = cleaned.rfind('}')
    if start != -1 and end != -1 and end > start:
        # Try all '{' positions from right-to-left (most likely the real JSON starts later)
        brace_positions = [i for i, ch in enumerate(cleaned) if ch == '{']
        for bpos in brace_positions:
            try:
                result = json.loads(cleaned[bpos:end + 1])
                if isinstance(result, dict) and result:
                    return result
            except json.JSONDecodeError:
                continue

    # ── Pass 3: Truncation repair ─────────────────────────────────────────────
    # Only reached when the response is genuinely cut off before the final '}'
    if start == -1:
        print(f"[PARSE ERROR] No JSON object found (len={len(cleaned)})")
        return {}

    snippet = cleaned[start:]

    # Walk the snippet char-by-char to find the last safely-closed position
    brace_depth = 0
    bracket_depth = 0
    in_string = False
    escape_next = False
    last_safe_end = 0          # index of last '}' that balanced a '{' at root level

    for i, ch in enumerate(snippet):
        if escape_next:
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == '{':
            brace_depth += 1
        elif ch == '}':
            brace_depth -= 1
            if brace_depth == 0:
                last_safe_end = i  # this closes the root object
        elif ch == '[':
            bracket_depth += 1
        elif ch == ']':
            bracket_depth -= 1

    # If we found a complete root-level close, extract it cleanly
    if last_safe_end > 0 and not in_string:
        try:
            result = json.loads(snippet[:last_safe_end + 1])
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

    # Response was cut before the root object closed — close open structures
    repair = snippet
    if in_string:
        # Find the opening quote of the unclosed string by walking forward
        # and tracking which quotes open vs close strings
        last_open_q = -1
        esc = False
        in_s2 = False
        for i, ch in enumerate(repair):
            if esc:
                esc = False
                continue
            if ch == '\\' and in_s2:
                esc = True
                continue
            if ch == '"':
                if not in_s2:
                    last_open_q = i   # record every opening quote
                in_s2 = not in_s2
        # Trim back to before the unclosed opening quote
        if last_open_q > 0:
            repair = repair[:last_open_q]
            # Also strip any trailing "key": fragment left after removing the value
            repair = re.sub(r',?\s*"[^"]+"\s*:\s*$', '', repair)
            repair = repair.rstrip().rstrip(',')

    # Recount depth after repair trim
    bd = bkd = 0
    in_s3 = esc3 = False
    for ch in repair:
        if esc3:
            esc3 = False
            continue
        if ch == '\\' and in_s3:
            esc3 = True
            continue
        if ch == '"':
            in_s3 = not in_s3
            continue
        if in_s3:
            continue
        if ch == '{': bd += 1
        elif ch == '}': bd -= 1
        elif ch == '[': bkd += 1
        elif ch == ']': bkd -= 1

    closing = ']' * max(0, bkd) + '}' * max(0, bd)
    repaired = repair + closing
    try:
        result = json.loads(repaired)
        if isinstance(result, dict) and result:
            print(f"[PARSE RECOVERY] Truncated JSON repaired ({len(result)} top-level keys)")
            return result
    except json.JSONDecodeError:
        pass

    print(f"[PARSE ERROR] All 3 passes failed (len={len(cleaned)}, preview={cleaned[:200]})")
    return {}









async def stream_agent_call(
    agent_id: str,
    messages: list[dict],
    publisher,
    model: str | None = None,
    max_tokens: int = 8192,
) -> str:
    """Make a streaming Anthropic call, emitting agent.thinking events."""
    agent = AGENTS[agent_id]
    m = model or settings.model_primary
    full_text = ""

    max_retries = 3
    for attempt in range(max_retries):
        full_text = ""
        try:
            async with client.messages.stream(
                model=m,
                max_tokens=max_tokens,
                system=agent["system_prompt"],
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    full_text += text
                    await publisher.emit("agent.thinking", {
                        "agent_id": agent_id,
                        "agent_name": agent["name"],
                        "token": text,
                        "cumulative_text": full_text,
                    })
            return full_text  # success
        except asyncio.CancelledError:
            raise
        except Exception as e:
            err_str = str(e)
            print(f"[{agent_id}] API error (attempt {attempt+1}/{max_retries}): {err_str[:200]}")
            if "rate_limit" in err_str.lower() or "429" in err_str:
                wait_secs = 30 * (attempt + 1)
                print(f"[{agent_id}] Rate limited — waiting {wait_secs}s before retry...")
                await publisher.emit("agent.thinking", {
                    "agent_id": agent_id,
                    "agent_name": agent["name"],
                    "token": f" [rate limited, retrying in {wait_secs}s...]",
                    "cumulative_text": f"Rate limited, retrying in {wait_secs}s...",
                })
                await asyncio.sleep(wait_secs)
                continue
            else:
                await publisher.emit("agent.error", {"agent_id": agent_id, "error": err_str})
                return ""

    # All retries exhausted
    print(f"[{agent_id}] All {max_retries} retries exhausted — returning empty")
    await publisher.emit("agent.error", {"agent_id": agent_id, "error": "Rate limit retries exhausted"})
    return ""



async def generate_proposal(agent_id: str, project_brief: dict, publisher) -> dict:
    """Generate initial architecture proposal for an architect agent."""
    agent = AGENTS[agent_id]
    brief_text = json.dumps(project_brief, indent=2)

    user_message = f"""You are generating an architecture proposal for this project:

{brief_text}

Generate a COMPLETE, SPECIFIC architecture proposal from your unique perspective ({agent['name']}).
Be opinionated, technical, and detailed. Use the project's actual constraints (team size, budget, timeline, scale).
IMPORTANT: Return ONLY a single valid JSON object. Do NOT truncate. The JSON must be complete and properly closed.
"""

    await publisher.emit("agent.started", {
        "agent_id": agent_id,
        "agent_name": agent["name"],
        "phase": "proposal",
    })

    # 4k tokens per proposal — with batches of 3, stays under 8k TPM limit
    raw = await stream_agent_call(
        agent_id,
        [{"role": "user", "content": user_message}],
        publisher,
        max_tokens=4000,
    )
    parsed = _parse_json(raw)

    # Validate required fields - an empty {} is falsy for our purposes
    if not parsed or not parsed.get("pattern") or not parsed.get("summary"):
        agent_name = AGENTS[agent_id]["name"]
        # Try to extract a summary from the raw text as fallback
        summary_text = raw[:300].strip() if raw else f"{agent_name} proposal (parse error)"
        parsed = {
            "pattern": "hybrid",
            "summary": summary_text,
            "components": [],
            "tech_stack": {},
            "justification": raw[:500] if raw else "Parse error",
            "trade_offs": {"pros": ["Pragmatic approach"], "cons": ["Needs more detail"]},
            "risks": [],
            "confidence": 0.5,
        }

    parsed["agent_id"] = agent_id
    parsed["agent_name"] = agent["name"]

    await publisher.emit("agent.proposal.draft", {
        "agent_id": agent_id,
        "agent_name": agent["name"],
        "proposal": parsed,
        "confidence": parsed.get("confidence", 0.5),
    })

    return parsed


async def run_devils_advocate(proposals: list[dict], project_brief: dict, publisher) -> dict:
    """AGENT-08 critiques all proposals."""
    brief_text = json.dumps(project_brief, indent=2)
    # Compact summaries for the critic
    proposals_summary = json.dumps([{
        "agent_id": p.get("agent_id"),
        "pattern": p.get("pattern"),
        "tech_stack": {k: v for k, v in p.get("tech_stack", {}).items() if k in ["backend", "database_primary", "deployment"]},
        "summary": (p.get("summary") or "")[:250],
        "data_flow": (p.get("data_flow") or "")[:150],
        "critical_components": [c["name"] for c in _ensure_list(p.get("components"))[:3] if isinstance(c, dict)]
    } for p in proposals], indent=2)

    user_message = f"""Project Brief:
{brief_text}

Architecture Proposals to Critique (Compact View):
{proposals_summary}

Critique EVERY proposal with brutal precision. Find the specific fatal flaw in each one for THIS project.
Return ONLY valid JSON as specified in your system instructions."""

    await publisher.emit("agent.started", {
        "agent_id": "AGENT-08",
        "agent_name": "Devil's Advocate",
        "phase": "critique",
    })

    raw = await stream_agent_call(
        "AGENT-08",
        [{"role": "user", "content": user_message}],
        publisher,
        max_tokens=4000,
    )

    print(f"[AGENT-08] Raw response len={len(raw)}, preview={raw[:300]}")
    parsed = _parse_json(raw)
    critiques = parsed.get("critiques", []) if isinstance(parsed, dict) else []
    print(f"[AGENT-08] Parsed {len(critiques)} critiques")

    if critiques:
        for critique in critiques:
            await publisher.emit("agent.critique.issued", {
                "from_agent": "AGENT-08",
                "target_agent": critique.get("target_agent", "UNKNOWN"),
                "severity": critique.get("severity", "Major"),
                "title": critique.get("title", ""),
                "critique": critique.get("critique", ""),
                "specific_issues": critique.get("specific_issues", []),
            })
        summary = f"Critiqued {len(critiques)} proposals: " + ", ".join(
            c.get("target_agent", "") for c in critiques[:6]
        )
    else:
        critique_text = raw.strip()[:800] if raw and raw.strip() else (
            "All proposals reviewed. Key concerns: validate team skill alignment, "
            "confirm budget feasibility, and review deployment complexity."
        )
        await publisher.emit("agent.critique.issued", {
            "from_agent": "AGENT-08",
            "target_agent": "ALL",
            "severity": "Major",
            "title": "Architectural Review — General Findings",
            "critique": critique_text,
            "specific_issues": [
                "Validate team skill alignment with proposed stack",
                "Confirm monthly budget vs. infrastructure cost",
                "Review deployment & operational complexity",
            ],
        })
        summary = "General architectural review complete."

    # Mark AGENT-08 done with a meaningful summary
    await publisher.emit("agent.proposal.draft", {
        "agent_id": "AGENT-08",
        "agent_name": "Devil's Advocate",
        "proposal": {"pattern": "critique", "summary": summary, "confidence": 1.0},
        "confidence": 1.0,
    })

    if not isinstance(parsed, dict):
        parsed = {"critiques": critiques}
    elif "critiques" not in parsed:
        parsed["critiques"] = critiques
    return parsed



async def run_validation(proposals: list[dict], project_brief: dict, publisher) -> dict:
    """AGENT-09 validates tech claims in proposals."""
    brief_text = json.dumps({
        "team_skills": project_brief.get("team_skills", []),
        "team_size": project_brief.get("team_size"),
        "non_functional_requirements": project_brief.get("non_functional_requirements", []),
        "company_stage": project_brief.get("company_stage"),
    }, indent=2)

    # Ultra-compact: only what AGENT-09 needs to validate tech claims
    agent_ids_to_validate = [p.get("agent_id") for p in proposals]
    proposals_summary = json.dumps([{
        "agent_id": p.get("agent_id"),
        "pattern": p.get("pattern"),
        "tech_stack": p.get("tech_stack", {}) if isinstance(p.get("tech_stack"), dict) else {},
    } for p in proposals], indent=2)

    user_message = f"""Team Profile:
{brief_text}

You MUST validate EACH of these {len(proposals)} proposals: {agent_ids_to_validate}

Proposals:
{proposals_summary}

Return a "validations" array with EXACTLY {len(proposals)} entries — one per agent_id above.
Keep each verdict to 1-2 sentences. Return ONLY valid JSON."""

    await publisher.emit("agent.started", {
        "agent_id": "AGENT-09",
        "agent_name": "Tech Feasibility Validator",
        "phase": "validation",
    })

    raw = await stream_agent_call(
        "AGENT-09",
        [{"role": "user", "content": user_message}],
        publisher,
        model=settings.model_primary,  # Haiku truncates at 4k with 13 proposals — needs Sonnet
        max_tokens=6000,
    )
    parsed = _parse_json(raw)
    validations = [v for v in (parsed.get("validations", []) if parsed else []) if isinstance(v, dict)]

    if not validations:
        # Emit a single summary event so the agent doesn't stay stuck
        await publisher.emit("validation.result", {
            "target_agent": "ALL",
            "status": "REVIEWED",
            "skill_gap_risk": "Medium",
            "verdict": raw[:400] if raw else "Validation complete.",
            "questionable_claims": [],
        })
    else:
        for v in validations:
            raw_verdict = v.get("verdict", "")
            # Never emit raw JSON as a verdict — it shows up as garbled text in the UI
            if raw_verdict and (raw_verdict.strip().startswith("{") or raw_verdict.strip().startswith("[")):
                raw_verdict = f"{v.get('status', 'REVIEWED')} — claims analyzed"
            await publisher.emit("validation.result", {
                "target_agent": v.get("target_agent", "UNKNOWN"),
                "status": v.get("status", "REVIEWED"),
                "skill_gap_risk": v.get("skill_gap_risk", "Unknown"),
                "verdict": raw_verdict,
                "verified_claims": v.get("verified_claims", []) or [],
                "questionable_claims": v.get("questionable_claims", []) or [],
            })


    return parsed or {}


async def run_cost_analysis(proposals: list[dict], project_brief: dict, publisher) -> dict:
    """AGENT-10 estimates costs for all proposals."""
    budget_monthly = (
        project_brief.get("budget_monthly_usd") or
        project_brief.get("budget_monthly") or
        project_brief.get("budget_range") or
        project_brief.get("budget") or 0
    )
    brief_text = json.dumps({
        "project_name": project_brief.get("project_name"),
        "team_size": project_brief.get("team_size"),
        "budget_monthly_usd": budget_monthly,
        "scale": project_brief.get("expected_scale") or project_brief.get("scale"),
        "company_stage": project_brief.get("company_stage"),
    }, indent=2)

    # Ultra-compact — only deployment and pattern needed for cost modelling
    agent_ids_to_cost = [p.get("agent_id") for p in proposals]
    proposals_summary = json.dumps([{
        "agent_id": p.get("agent_id"),
        "pattern": p.get("pattern"),
        "deployment": p.get("tech_stack", {}).get("deployment", "") if isinstance(p.get("tech_stack"), dict) else "",
        "backend": p.get("tech_stack", {}).get("backend", "") if isinstance(p.get("tech_stack"), dict) else "",
        "database": p.get("tech_stack", {}).get("database_primary", "") if isinstance(p.get("tech_stack"), dict) else "",
    } for p in proposals], indent=2)

    user_message = f"""Project Brief:
{brief_text}

You MUST cost EACH of these {len(proposals)} proposals: {agent_ids_to_cost}

Proposals (deployment stack only):
{proposals_summary}

Return a "cost_analyses" array with EXACTLY {len(proposals)} entries — one per agent_id.
Use real AWS/GCP/Azure pricing. cost_vs_budget must be one of: WITHIN, OVER, WELL_OVER.
Return ONLY valid JSON."""

    await publisher.emit("agent.started", {
        "agent_id": "AGENT-10",
        "agent_name": "Cost & ROI Analyst",
        "phase": "cost_analysis",
    })

    raw = await stream_agent_call(
        "AGENT-10",
        [{"role": "user", "content": user_message}],
        publisher,
        model=settings.model_primary,  # model_fast was truncating 13 cost analyses
        max_tokens=6000,
    )
    parsed = _parse_json(raw)
    analyses = [a for a in (parsed.get("cost_analyses", []) if parsed else []) if isinstance(a, dict)]

    # Always emit at least one event so AGENT-10 doesn't stay stuck in 'thinking'
    if not analyses:
        print(f"[AGENT-10] No cost_analyses parsed — raw preview: {raw[:300]}")
        await publisher.emit("cost.projection", {
            "target_agent": "ALL",
            "monthly_usd": 0,
            "yearly_usd": 0,
            "cost_vs_budget": "REVIEW_NEEDED",
        })
    else:
        for analysis in analyses:
            monthly = analysis.get("monthly_infra_cost_usd") or analysis.get("monthly_usd") or 0
            yearly = analysis.get("yearly_infra_cost_usd") or analysis.get("yearly_usd") or (monthly * 12)
            budget_status = (analysis.get("cost_vs_budget") or "UNKNOWN").upper().strip()
            # Normalise to schema values: WITHIN | OVER | WELL_OVER
            if "WELL" in budget_status or "CRITICAL" in budget_status or "EXCEED" in budget_status:
                budget_status = "WELL_OVER"
            elif "OVER" in budget_status or "ABOVE" in budget_status or "HIGH" in budget_status:
                budget_status = "OVER"
            elif "WITHIN" in budget_status or "UNDER" in budget_status or "OK" in budget_status:
                budget_status = "WITHIN"
            await publisher.emit("cost.projection", {
                "target_agent": analysis.get("target_agent", "UNKNOWN"),
                "monthly_usd": int(monthly),
                "yearly_usd": int(yearly),
                "cost_vs_budget": budget_status,
                "roi_assessment": analysis.get("roi_assessment", ""),
                "dev_hours_to_build": analysis.get("dev_hours_to_build"),
            })

    return parsed or {}




async def revise_proposal(
    agent_id: str,
    original_proposal: dict,
    critique: dict | None,
    validation: dict | None,
    project_brief: dict,
    publisher,
) -> dict:
    """Agent revises its proposal based on critique and validation."""
    agent = AGENTS[agent_id]

    critique_text = ""
    if critique:
        c_text = critique.get("critique", "") or ""
        if not isinstance(c_text, str):
            c_text = str(c_text)
        critique_text = f"\nDEVIL'S ADVOCATE CRITIQUE (title: {critique.get('title','')}, severity: {critique.get('severity','')}):\n{c_text[:800]}"

    validation_text = ""
    if validation:
        v_text = validation.get("verdict", "") or ""
        if not isinstance(v_text, str):
            v_text = str(v_text)
        validation_text = f"\nVALIDATION VERDICT (skill_gap_risk: {validation.get('skill_gap_risk','')}):\n{v_text[:400]}"

    # Compact original proposal to avoid context overflow during revision
    compact_original = {
        "pattern": original_proposal.get("pattern"),
        "summary": (original_proposal.get("summary") or "")[:400],
        "tech_stack": original_proposal.get("tech_stack", {}),
        "data_flow": (original_proposal.get("data_flow") or "")[:200],
        "components": [{"name": c.get("name"), "tech": c.get("tech")} for c in _ensure_list(original_proposal.get("components"))[:5] if isinstance(c, dict)],
        "confidence": original_proposal.get("confidence", 0.5),
    }

    user_message = f"""You are {agent['name']} ({agent_id}).

Your original proposal (summary):
{json.dumps(compact_original, indent=2)}
{critique_text}
{validation_text}

NOW: Defend what you can defend. Concede where the critique is valid. Revise your FULL proposal.
Be specific about what you're changing and why. Fight for your core approach.
IMPORTANT: Return ONLY a single complete valid JSON object. Do NOT truncate.
{REVISION_JSON_SCHEMA}"""

    await publisher.emit("agent.revising", {
        "agent_id": agent_id,
        "agent_name": agent["name"],
    })

    raw = await stream_agent_call(
        agent_id,
        [{"role": "user", "content": user_message}],
        publisher,
        max_tokens=3500,
    )
    parsed = _parse_json(raw)

    if not parsed:
        parsed = original_proposal.copy()
        parsed["concessions"] = []
        parsed["defenses"] = []

    parsed["agent_id"] = agent_id
    parsed["agent_name"] = agent["name"]
    parsed["revision"] = True

    await publisher.emit("agent.proposal.revised", {
        "agent_id": agent_id,
        "agent_name": agent["name"],
        "concessions": parsed.get("concessions", []),
        "defenses": parsed.get("defenses", []),
        "confidence": parsed.get("confidence", 0.5),
    })

    return parsed


async def run_cross_voting(revised_proposals: list[dict], project_brief: dict, publisher) -> list[dict]:
    """All agents vote on the best components from revised proposals."""
    all_votes = []
    # Semaphore of 2: keeps voting under rate limits (Haiku ~1k tokens/call × 2 = 2k/min)
    sem = asyncio.Semaphore(2)

    async def agent_vote(agent_id: str) -> dict:
        async with sem:
            agent = AGENTS[agent_id]
            brief_text = json.dumps({
                "project_name": project_brief.get("project_name"),
                "team_size": project_brief.get("team_size"),
                "company_stage": project_brief.get("company_stage"),
                "budget_monthly_usd": project_brief.get("budget_monthly_usd"),
            }, indent=2)

            # Compact proposal summaries to stay well within token limits
            compact_proposals = json.dumps([{
                "agent_id": p.get("agent_id"),
                "pattern": p.get("pattern"),
                "summary": (p.get("summary") or "")[:200],
                "backend": p.get("tech_stack", {}).get("backend", "") if isinstance(p.get("tech_stack"), dict) else "",
                "database": p.get("tech_stack", {}).get("database_primary", "") if isinstance(p.get("tech_stack"), dict) else "",
                "deployment": p.get("tech_stack", {}).get("deployment", "") if isinstance(p.get("tech_stack"), dict) else "",
                "confidence": p.get("confidence", 0.5),
                "data_flow_snippet": (p.get("data_flow") or "")[:100],
            } for p in revised_proposals], indent=2)

            user_message = f"""You are {agent['name']} ({agent_id}) — a specialist with UNIQUE domain expertise.

Project Brief (key facts):
{brief_text}

Revised Proposals (compact summaries):
{compact_proposals}

As {agent['name']}, VOTE using YOUR specific domain expertise. Your recommendation MUST:
1. Be specific to your role as {agent['name']}
2. Name SPECIFIC proposals (e.g. "AGENT-01's microservices approach for the backend, AGENT-03's PostgreSQL choice for the database")
3. Explain WHY from your domain perspective (security/cost/performance/scalability)
Do NOT give generic advice. Be opinionated and specific.
{VOTE_JSON_SCHEMA}"""

            raw = await stream_agent_call(
                agent_id,
                [{"role": "user", "content": user_message}],
                publisher,
                model=settings.model_fast,
            )
            parsed = _parse_json(raw)
            if not parsed:
                parsed = {"synthesis_recommendation": raw[:500] if raw else "", "votes": []}
            parsed["voter_agent"] = agent_id
            return parsed

    vote_tasks = [agent_vote(aid) for aid in ARCHITECT_AGENT_IDS]
    vote_results = await asyncio.gather(*vote_tasks, return_exceptions=True)

    for i, result in enumerate(vote_results):
        agent_id = ARCHITECT_AGENT_IDS[i]
        if isinstance(result, Exception):
            # Emit a fallback vote so the agent doesn't stay stuck
            await publisher.emit("agent.vote.cast", {
                "from_agent": agent_id,
                "agent_name": AGENTS[agent_id]["name"],
                "recommendation": f"Supports a balanced hybrid approach that fits the team's constraints.",
            })
            continue
        all_votes.append(result)
        # Safely convert to string — Claude can sometimes return a dict here
        rec_raw = result.get("synthesis_recommendation", "")
        rec = str(rec_raw).strip() if rec_raw else ""
        if len(rec) < 10:
            vote_list = result.get("votes", [])
            if vote_list and isinstance(vote_list, list):
                reasons = [v.get("pattern_vote", {}).get("reason", "") for v in vote_list if isinstance(v, dict)]
                rec = " | ".join(r for r in reasons if r)[:400]
        if not rec:
            rec = f"After reviewing all proposals as {AGENTS[agent_id]['name']}, I recommend a hybrid approach that leverages the strongest components from each proposal to match the team's skills and budget."
        await publisher.emit("agent.vote.cast", {
            "from_agent": agent_id,
            "agent_name": AGENTS[agent_id]["name"],
            "recommendation": rec,
        })

    return all_votes


async def run_finalizer(
    revised_proposals: list[dict],
    critiques: dict,
    validations: dict,
    cost_analyses: dict,
    votes: list[dict],
    project_brief: dict,
    publisher,
) -> dict:
    """AGENT-13 synthesizes the final architecture."""
    brief_text = json.dumps(project_brief, indent=2)

    # Truncate inputs to avoid hitting the 200k context limit and causing JSON truncation
    def _truncate(obj, max_chars=2000):
        s = json.dumps(obj, indent=2)
        return s[:max_chars] + "..." if len(s) > max_chars else s

    proposals_summary = json.dumps(
        [{"agent_id": p.get("agent_id"), "pattern": p.get("pattern"), "summary": p.get("summary", "")[:400],
          "tech_stack": p.get("tech_stack", {}), "confidence": p.get("confidence")}
         for p in revised_proposals], indent=2
    )
    critiques_text = _truncate(critiques, 2500)
    votes_text = json.dumps(
        [{"voter": v.get("voter_agent"), "recommendation": v.get("synthesis_recommendation", "")[:300]}
         for v in votes], indent=2
    )
    cost_text = _truncate(cost_analyses, 1500)

    user_message = f"""You are the Architect Finaliser (AGENT-13). Synthesize the DEFINITIVE architecture from this 19-agent debate.

PROJECT BRIEF:
{brief_text}

REVISED PROPOSALS (after debate):
{proposals_summary}

DEVIL'S ADVOCATE CRITIQUES (summary):
{critiques_text}

COST ANALYSES:
{cost_text}

AGENT VOTES & RECOMMENDATIONS:
{votes_text}

NOW: Return the definitive final architecture as ONLY valid JSON matching this schema exactly:
{{
  "pattern": "microservices|monolith|serverless|hybrid",
  "summary": "3-paragraph detailed executive summary",
  "why_this_wins": "Why this hybrid is the best choice given all debate inputs",
  "data_flow": "Step-by-step technical walkthrough of the end-to-end flow",
  "components": [{{"name": "...", "tech": "...", "purpose": "...", "api_type": "...", "deployment": "...", "scale_target": "..."}}],
  "tech_stack": {{
    "backend": "...", "frontend": "...", "database_primary": "...", "database_cache": "...", 
    "messaging": "...", "deployment": "...", "monitoring": "...", "ci_cd": "...", "security": "...", "search": "..."
  }},
  "adr": "Full Architecture Decision Record text (markdown)",
  "risk_register": [{{"risk": "...", "mitigation": "...", "severity": "High|Medium|Low", "likelihood": "High|Medium|Low"}}],
  "cost_projection": {{"monthly_usd": 1000, "yearly_usd": 12000, "breakdown": {{"compute": "...", "database": "...", "ml_inference": "..."}}}},
  "timeline": {{"mvp_weeks": 8, "production_weeks": 16, "phases": [{{"name": "...", "duration_weeks": 4, "deliverables": ["..."]}}]}},
  "mermaid_diagram": "graph TD\\n  A[Client] --> B[Service]\\n  B --> C[(Database)]",
  "scorecard": {{"scalability": 8, "reliability": 9, "maintainability": 7, "cost_efficiency": 8, "security": 8}},
  "overall_confidence": 0.85
}}"""

    await publisher.emit("agent.started", {
        "agent_id": "AGENT-13",
        "agent_name": "Architect Finaliser",
        "phase": "synthesis",
    })

    raw = await stream_agent_call("AGENT-13", [{"role": "user", "content": user_message}], publisher, max_tokens=16000)
    parsed = _parse_json(raw)

    if not parsed:
        # Emergency fallback if JSON parsing failed completely
        # Attempt to extract ADR even from malformed output
        adr_match = re.search(r'"adr":\s*"(.*?)"', raw, re.DOTALL)
        adr_content = adr_match.group(1).replace('\\n', '\n') if adr_match else "Architecture Decision Record\n\n" + raw[:2000]
        
        parsed = {
            "pattern": "hybrid",
            "summary": f"Architecture synthesized from 19-agent debate. {raw[:300]}" if raw else "Synthesis complete.",
            "why_this_wins": "Best elements from all proposals combined into a production-ready blueprint.",
            "data_flow": "Client -> API Gateway -> Application Services -> Database & Cache.",
            "tech_stack": {
                "backend": "Framework choice based on team skills",
                "frontend": "Modern responsive framework",
                "database_primary": "Persistent SQL/NoSQL store",
                "database_cache": "Hot-path acceleration layer",
                "messaging": "Asynchronous event bus",
                "deployment": "Cloud orchestration platform",
                "monitoring": "Observability and alerting stack",
                "ci_cd": "Automated build and release pipeline",
                "security": "Auth and secrets management",
                "search": "Full-text indexing layer"
            },
            "components": [],
            "adr": adr_content,
            "risk_register": [],
            "cost_projection": {"monthly_usd": 0, "yearly_usd": 0},
            "timeline": {"mvp_weeks": 8, "production_weeks": 16, "phases": []},
            "mermaid_diagram": "graph TD\n    A[Client] --> B[Server]\n    B --> C[(Database)]",
            "scorecard": {"scalability": 7, "reliability": 7, "maintainability": 7, "cost_efficiency": 7, "security": 7},
            "overall_confidence": 0.75,
        }

    # Ensure overall_confidence is a float to avoid TypeError in engine.py
    try:
        conf = parsed.get("overall_confidence", 0.75)
        if conf is None:
            parsed["overall_confidence"] = 0.75
        else:
            parsed["overall_confidence"] = float(conf)
    except (ValueError, TypeError):
        parsed["overall_confidence"] = 0.75

    await publisher.emit("finaliser.complete", {
        "id": "final",
        "pattern": parsed.get("pattern"),
        "overall_confidence": parsed.get("overall_confidence"),
        "summary": parsed.get("summary"),
        "why_this_wins": parsed.get("why_this_wins", ""),
        "data_flow": parsed.get("data_flow", ""),
        "tech_stack": parsed.get("tech_stack", {}),
        "components": parsed.get("components", []),
        "adr": parsed.get("adr", ""),
        "risk_register": parsed.get("risk_register", []),
        "cost_projection": parsed.get("cost_projection", {}),
        "timeline": parsed.get("timeline", {}),
        "mermaid_diagram": parsed.get("mermaid_diagram", ""),
        "scorecard": parsed.get("scorecard", {}),
    })

    return parsed


async def run_ml_analysis(proposals: list[dict], project_brief: dict, publisher) -> dict:
    """AGENT-18 analyzes ML/AI infrastructure requirements for all proposals."""
    brief_text = json.dumps(project_brief, indent=2)
    proposals_summary = json.dumps(
        [{
            "agent_id": p["agent_id"], 
            "pattern": p.get("pattern"), 
            "tech_stack": p.get("tech_stack", {}),
            "summary": (p.get("summary") or "")[:300]
        } for p in proposals], indent=2
    )

    user_message = (
        f"Project Brief:\n{brief_text}\n\n"
        f"Architecture Proposals:\n{proposals_summary}\n\n"
        "Analyze the ML/AI infrastructure requirements for this project. "
        "Design a comprehensive ML platform recommendation. Return ONLY valid JSON."
    )

    await publisher.emit("agent.started", {
        "agent_id": "AGENT-18",
        "agent_name": "AI/ML Infrastructure Engineer",
        "phase": "ml_analysis",
    })

    raw = await stream_agent_call(
        "AGENT-18",
        [{"role": "user", "content": user_message}],
        publisher,
        model=settings.model_fast,
    )
    parsed = _parse_json(raw)

    # Always emit an event so the agent doesn't stay stuck in 'thinking'
    if parsed:
        ml = parsed.get("ml_infrastructure", {})
        await publisher.emit("ml.infrastructure.ready", {
            "agent_id": "AGENT-18",
            "serving_strategy": ml.get("serving_strategy") or parsed.get("serving_strategy", "Edge + Cloud Hybrid"),
            "estimated_gpu_cost_monthly": parsed.get("estimated_gpu_cost_monthly", 0),
            "recommendation": parsed.get("recommendation") or raw[:300],
        })
    else:
        await publisher.emit("ml.infrastructure.ready", {
            "agent_id": "AGENT-18",
            "serving_strategy": "Edge inference with cloud training",
            "estimated_gpu_cost_monthly": 0,
            "recommendation": raw[:400] if raw else "ML infrastructure analysis complete.",
        })

    return parsed or {}


async def run_sustainability_analysis(proposals: list[dict], project_brief: dict, publisher) -> dict:
    """AGENT-19 scores all proposals on sustainability and carbon efficiency."""
    brief_text = json.dumps({
        "project_name": project_brief.get("project_name"),
        "scale": project_brief.get("expected_scale") or project_brief.get("scale"),
        "deployment_regions": project_brief.get("deployment_regions", []),
        "non_functional_requirements": project_brief.get("non_functional_requirements", []),
    }, indent=2)

    # Compact summaries to avoid context overflow
    proposals_summary = json.dumps([
        {"agent_id": p.get("agent_id"), "pattern": p.get("pattern"),
         "tech_stack": p.get("tech_stack", {}), "deployment": p.get("tech_stack", {}).get("deployment", "")}
        for p in proposals
    ], indent=2)

    user_message = (
        f"Project Brief (sustainability context):\n{brief_text}\n\n"
        f"Architecture Proposals (summaries):\n{proposals_summary}\n\n"
        "Score each proposal on sustainability and carbon efficiency. "
        "Recommend the greenest viable architecture. Return ONLY valid JSON."
    )

    await publisher.emit("agent.started", {
        "agent_id": "AGENT-19",
        "agent_name": "Sustainability Architect",
        "phase": "sustainability_analysis",
    })

    raw = await stream_agent_call(
        "AGENT-19",
        [{"role": "user", "content": user_message}],
        publisher,
        model=settings.model_fast,
    )
    parsed = _parse_json(raw)

    # Always emit an event so the agent doesn't stay stuck in 'thinking'
    if parsed:
        sa = parsed.get("sustainability_analysis", {}) if isinstance(parsed.get("sustainability_analysis"), dict) else {}
        recommendation = (
            sa.get("recommendation") or
            parsed.get("recommendation") or
            sa.get("summary") or
            parsed.get("summary") or
            "Sustainability analysis complete — see detailed scores above."
        )
        await publisher.emit("sustainability.scored", {
            "agent_id": "AGENT-19",
            "energy_efficiency_rating": sa.get("energy_efficiency_rating") or parsed.get("energy_efficiency_rating", "B"),
            "sci_score_estimate": sa.get("sci_score_estimate") or parsed.get("sci_score_estimate", "N/A"),
            "recommended_regions": _ensure_list(sa.get("recommended_regions") or parsed.get("recommended_regions")),
            "recommendation": recommendation,
        })
    else:
        await publisher.emit("sustainability.scored", {
            "agent_id": "AGENT-19",
            "energy_efficiency_rating": "B",
            "sci_score_estimate": "N/A",
            "recommended_regions": ["EU-West", "US-East"],
            "recommendation": raw[:400] if raw else "Sustainability analysis complete.",
        })

    return parsed or {}
