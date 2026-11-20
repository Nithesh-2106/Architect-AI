"""
Generates downloadable PDF and DOCX architecture reports with full detailed content.
Saves to ./output/ directory and serves via /files/ route.
"""

import os
import asyncio
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from docx import Document as DocxDocument
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

OUTPUT_DIR = Path("./output")
OUTPUT_DIR.mkdir(exist_ok=True)

DARK_BG  = colors.HexColor("#0d1117")
ACCENT   = colors.HexColor("#00d4ff")
ACCENT2  = colors.HexColor("#7c3aed")
ACCENT3  = colors.HexColor("#10b981")
TEXT     = colors.HexColor("#e2e8f0")
TEXT2    = colors.HexColor("#94a3b8")
SURFACE  = colors.HexColor("#141b24")
SURFACE2 = colors.HexColor("#1a2332")
DANGER   = colors.HexColor("#ef4444")
SUCCESS  = colors.HexColor("#10b981")
WARNING  = colors.HexColor("#f59e0b")
BORDER   = colors.HexColor("#1e2d3d")

LAYER_DESCRIPTIONS = {
    "backend":          "Core application server — handles API requests, business logic, data processing and service orchestration",
    "frontend":         "Client-side application layer — user interface, state management and browser-side rendering",
    "database_primary": "Primary persistent data store — main source of truth for application state and domain data",
    "database_cache":   "In-memory caching layer — hot-path acceleration, session storage and read-performance optimization",
    "messaging":        "Asynchronous event bus — inter-service communication, event streaming and background job queuing",
    "deployment":       "Infrastructure and container orchestration — packaging, scaling and runtime environment management",
    "monitoring":       "Observability platform — metrics collection, distributed tracing, log aggregation and alerting",
    "ci_cd":            "Continuous integration and deployment pipeline — automated testing, build and release automation",
    "security":         "Authentication, authorization and secrets management — identity, access control and key vaulting",
    "search":           "Full-text search and indexing layer — query acceleration and relevance scoring for discovery features",
}


def _severity_color(sev: str) -> colors.Color:
    sev = (sev or "").lower()
    if sev == "high":   return DANGER
    if sev == "medium": return WARNING
    return SUCCESS


def _to_list(val) -> list:
    """Safely coerce any value to a list. Prevents 'unhashable type: slice' when LLM returns wrong type."""
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        return list(val.values())
    return []


async def generate_documents(
    session_id: str, arch: dict, brief: dict
) -> tuple[str | None, str | None]:
    """Generate PDF and DOCX. Returns (pdf_path, docx_path) relative to OUTPUT_DIR."""
    loop = asyncio.get_event_loop()
    pdf_path  = await loop.run_in_executor(None, _generate_pdf,  session_id, arch, brief)
    docx_path = await loop.run_in_executor(None, _generate_docx, session_id, arch, brief)
    return pdf_path, docx_path


# ─────────────────────────────────────── PDF ────────────────────────────────


def _generate_pdf(session_id: str, arch: dict, brief: dict) -> str | None:
    try:
        filename = f"architecture_{session_id[:8]}.pdf"
        filepath = OUTPUT_DIR / filename

        doc = SimpleDocTemplate(
            str(filepath), pagesize=A4,
            rightMargin=2*cm, leftMargin=2*cm,
            topMargin=2*cm, bottomMargin=2*cm,
        )

        styles = getSampleStyleSheet()
        title_s = ParagraphStyle("T",  fontSize=30, textColor=TEXT,  fontName="Helvetica-Bold", spaceAfter=4, alignment=TA_CENTER)
        sub_s   = ParagraphStyle("S",  fontSize=13, textColor=TEXT2, fontName="Helvetica",       spaceAfter=4, alignment=TA_CENTER)
        proj_s  = ParagraphStyle("P",  fontSize=22, textColor=ACCENT, fontName="Helvetica-Bold", spaceAfter=6, alignment=TA_CENTER)
        h1_s    = ParagraphStyle("H1", fontSize=16, textColor=ACCENT,  fontName="Helvetica-Bold", spaceBefore=20, spaceAfter=8)
        h2_s    = ParagraphStyle("H2", fontSize=12, textColor=TEXT,    fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=4)
        h3_s    = ParagraphStyle("H3", fontSize=10, textColor=ACCENT3, fontName="Helvetica-Bold", spaceBefore=6,  spaceAfter=3)
        body_s  = ParagraphStyle("B",  fontSize=9,  textColor=TEXT2,   fontName="Helvetica",      leading=15, spaceAfter=4)
        small_s = ParagraphStyle("Sm", fontSize=8,  textColor=TEXT2,   fontName="Helvetica",      leading=13, spaceAfter=3)
        badge_s = ParagraphStyle("Bg", fontSize=10, textColor=SUCCESS,  fontName="Helvetica-Bold", spaceAfter=6)
        mono_s  = ParagraphStyle("M",  fontSize=8,  textColor=ACCENT,  fontName="Courier",        backColor=SURFACE, leading=13, spaceAfter=4)

        def hr():
            return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=8, spaceBefore=4)

        def section_hr():
            return HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10, spaceBefore=2)

        def tbl_style(header_color=ACCENT, header_text=DARK_BG):
            return TableStyle([
                ("BACKGROUND",  (0, 0), (-1,  0), header_color),
                ("TEXTCOLOR",   (0, 0), (-1,  0), header_text),
                ("FONTNAME",    (0, 0), (-1,  0), "Helvetica-Bold"),
                ("FONTSIZE",    (0, 0), (-1, -1), 8),
                ("TEXTCOLOR",   (0, 1), (-1, -1), TEXT2),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, SURFACE2]),
                ("GRID",        (0, 0), (-1, -1), 0.4, BORDER),
                ("PADDING",     (0, 0), (-1, -1), 6),
                ("VALIGN",      (0, 0), (-1, -1), "TOP"),
            ])

        story = []
        confidence = int(float(arch.get("overall_confidence", 0) or 0) * 100)

        # ── Cover Page ────────────────────────────────────────────────────
        story += [
            Spacer(1, 2.5*cm),
            Paragraph("ArchitectAI", title_s),
            Paragraph("Multi-Agent Architecture Decision Report", sub_s),
            HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=16),
            Paragraph(brief.get("project_name", "Architecture Design"), proj_s),
            Spacer(1, 0.5*cm),
            Paragraph(f"Pattern: <b>{arch.get('pattern','Unknown').upper()}</b>  |  Confidence: <b>{confidence}%</b>  |  Synthesized by 19 AI agents", body_s),
            Spacer(1, 3*cm),
            Paragraph("Generated by ArchitectAI · Powered by Multi-Agent Debate Engine", small_s),
            PageBreak(),
        ]

        # ── Executive Summary ─────────────────────────────────────────────
        story.append(Paragraph("EXECUTIVE SUMMARY", h1_s))
        story.append(section_hr())
        summary = arch.get("summary", "No summary provided.")
        story.append(Paragraph(summary, body_s))
        why = arch.get("why_this_wins", "")
        if why:
            story.append(Spacer(1, 6))
            story.append(Paragraph("WHY THIS ARCHITECTURE WON THE DEBATE", h3_s))
            story.append(Paragraph(why, body_s))
        story.append(Spacer(1, 0.3*cm))

        # ── Technology Stack — Layer by Layer ─────────────────────────────
        story.append(Paragraph("TECHNOLOGY STACK — LAYER BY LAYER", h1_s))
        story.append(section_hr())
        stack = arch.get("tech_stack", {})
        if stack:
            # Wrap in Paragraphs to allow word wrap
            stack_data = [[
                Paragraph("<b>Layer</b>", body_s),
                Paragraph("<b>Technology</b>", body_s),
                Paragraph("<b>Role & Purpose</b>", body_s)
            ]]
            for k, v in stack.items():
                desc = LAYER_DESCRIPTIONS.get(k, "")
                stack_data.append([
                    Paragraph(k.replace("_", " ").title(), body_s),
                    Paragraph(str(v), body_s),
                    Paragraph(desc, body_s),
                ])
            t = Table(stack_data, colWidths=[3.5*cm, 4.5*cm, 9.5*cm])
            t.setStyle(tbl_style())
            story.append(t)
        story.append(Spacer(1, 0.3*cm))

        # ── System Data Flow ──────────────────────────────────────────────
        data_flow = arch.get("data_flow")
        if data_flow:
            story.append(Paragraph("SYSTEM DATA FLOW", h1_s))
            story.append(section_hr())
            story.append(Paragraph(data_flow, body_s))
            story.append(Spacer(1, 0.3*cm))

        # ── Component Catalog ─────────────────────────────────────────────
        story.append(Paragraph(f"COMPONENT CATALOG ({len(_to_list(arch.get('components')))} COMPONENTS)", h1_s))
        story.append(section_hr())
        components = _to_list(arch.get("components"))
        if components:
            comp_data = [[
                Paragraph("<b>Component</b>", body_s),
                Paragraph("<b>Technology</b>", body_s),
                Paragraph("<b>API Type</b>", body_s),
                Paragraph("<b>Purpose</b>", body_s),
                Paragraph("<b>Deployment</b>", body_s)
            ]]
            for c in components:
                api_type   = c.get("api_type", "—")
                deployment = c.get("deployment") or c.get("scale_target") or "—"
                comp_data.append([
                    Paragraph(c.get("name", ""), body_s),
                    Paragraph(c.get("tech", "—"), body_s),
                    Paragraph(api_type, body_s),
                Paragraph(deployment, body_s),
                ])
            # Fine-tuned for A4 (Total ~17.5cm usable width)
            ct = Table(comp_data, colWidths=[3.2*cm, 3.2*cm, 1.8*cm, 6.8*cm, 2.5*cm])
            ct.setStyle(tbl_style(header_color=ACCENT2, header_text=TEXT))
            story.append(ct)
        story.append(Spacer(1, 0.3*cm))

        # ── Architecture Decision Record ───────────────────────────────────
        story.append(Paragraph("ARCHITECTURE DECISION RECORD (ADR)", h1_s))
        story.append(section_hr())
        adr = arch.get("adr", "No ADR generated.")
        for line in adr.split("\n"):
            stripped = line.strip()
            if not stripped:
                story.append(Spacer(1, 4))
            elif stripped.startswith("### "):
                story.append(Paragraph(stripped[4:].upper(), h3_s))
            elif stripped.startswith("## "):
                story.append(Paragraph(stripped[3:].upper(), h2_s))
            elif stripped.startswith("# "):
                story.append(Paragraph(stripped[2:].upper(), h2_s))
            elif stripped.startswith("- ") or stripped.startswith("* "):
                story.append(Paragraph(f"• {stripped[2:]}", body_s))
            else:
                story.append(Paragraph(stripped, body_s))
        story.append(Spacer(1, 0.3*cm))

        # ── Risk Register ──────────────────────────────────────────────────
        story.append(Paragraph("RISK REGISTER", h1_s))
        story.append(section_hr())
        risks = _to_list(arch.get("risk_register"))
        if risks:
            risk_data = [[
                Paragraph("<b>Risk</b>", body_s),
                Paragraph("<b>Severity</b>", body_s),
                Paragraph("<b>Likelihood</b>", body_s),
                Paragraph("<b>Mitigation Strategy</b>", body_s)
            ]]
            for r in risks:
                risk_data.append([
                    Paragraph(r.get("risk", ""), body_s),
                    Paragraph(r.get("severity", "Medium"), body_s),
                    Paragraph(r.get("likelihood", "—"), body_s),
                    Paragraph(r.get("mitigation", ""), body_s),
                ])
            rt = Table(risk_data, colWidths=[4.5*cm, 2.5*cm, 2.5*cm, 8*cm])
            sev_ts = TableStyle([
                ("BACKGROUND",  (0, 0), (-1,  0), DANGER),
                ("TEXTCOLOR",   (0, 0), (-1,  0), colors.white),
                ("FONTNAME",    (0, 0), (-1,  0), "Helvetica-Bold"),
                ("FONTSIZE",    (0, 0), (-1, -1), 8),
                ("TEXTCOLOR",   (0, 1), (-1, -1), TEXT2),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, SURFACE2]),
                ("GRID",        (0, 0), (-1, -1), 0.4, BORDER),
                ("PADDING",     (0, 0), (-1, -1), 6),
                ("VALIGN",      (0, 0), (-1, -1), "TOP"),
            ])
            rt.setStyle(sev_ts)
            story.append(rt)
        else:
            story.append(Paragraph("No risks identified.", body_s))
        story.append(Spacer(1, 0.3*cm))

        # ── Cost Projection ────────────────────────────────────────────────
        story.append(Paragraph("COST PROJECTION (12-MONTH TCO)", h1_s))
        story.append(section_hr())
        cost = arch.get("cost_projection", {})
        if not isinstance(cost, dict):
            cost = {}
        monthly = int(cost.get("monthly_usd", 0) or 0)
        yearly  = int(cost.get("yearly_usd", monthly * 12) or 0)
        story.append(Paragraph(
            f"MONTHLY INFRASTRUCTURE COST: <b>${monthly:,}</b>   |   "
            f"ANNUAL TOTAL COST OF OWNERSHIP: <b>${yearly:,}</b>",
            badge_s,
        ))
        breakdown = cost.get("breakdown", {})
        if isinstance(breakdown, dict) and breakdown:
            story.append(Paragraph("COST BREAKDOWN BY CATEGORY:", h3_s))
            bd_data = [[
                Paragraph("<b>Category</b>", body_s),
                Paragraph("<b>Estimated Cost / Notes</b>", body_s)
            ]]
            for k, v in breakdown.items():
                bd_data.append([
                    Paragraph(str(k).replace("_", " ").title(), body_s),
                    Paragraph(str(v), body_s)
                ])
            bt = Table(bd_data, colWidths=[5*cm, 12.5*cm])
            bt.setStyle(tbl_style(header_color=ACCENT2, header_text=TEXT))
            story.append(bt)
        assumptions = cost.get("assumptions", "")
        if assumptions and isinstance(assumptions, str):
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"Assumptions: {assumptions}", small_s))
        story.append(Spacer(1, 0.3*cm))

        # ── Scorecard ──────────────────────────────────────────────────────
        story.append(Paragraph("ARCHITECTURE SCORECARD", h1_s))
        story.append(section_hr())
        scorecard = arch.get("scorecard", {})
        if isinstance(scorecard, dict) and scorecard:
            sc_data = [[
                Paragraph("<b>Dimension</b>", body_s),
                Paragraph("<b>Score</b>", body_s),
                Paragraph("<b>Max</b>", body_s),
                Paragraph("<b>Notes</b>", body_s)
            ]]
            for dim, data in scorecard.items():
                if isinstance(data, dict):
                    sc_data.append([
                        Paragraph(str(dim).replace("_", " ").title(), body_s),
                        Paragraph(str(data.get("score", "—")), body_s),
                        Paragraph(str(data.get("max", 10)), body_s),
                        Paragraph(str(data.get("notes", "")), body_s),
                    ])
                elif isinstance(data, (int, float)):
                    sc_data.append([
                        Paragraph(dim.replace("_", " ").title(), body_s),
                        Paragraph(str(data), body_s),
                        Paragraph("10", body_s),
                        Paragraph("", body_s)
                    ])
            if len(sc_data) > 1:
                sct = Table(sc_data, colWidths=[4.5*cm, 1.5*cm, 1.5*cm, 10*cm])
                sct.setStyle(tbl_style())
                story.append(sct)
        story.append(Spacer(1, 0.3*cm))

        # ── Implementation Timeline ────────────────────────────────────────
        story.append(Paragraph("IMPLEMENTATION TIMELINE", h1_s))
        story.append(section_hr())
        timeline = arch.get("timeline", {})
        story.append(Paragraph(
            f"MVP TARGET: <b>{timeline.get('mvp_weeks','?')} WEEKS</b>   |   "
            f"PRODUCTION-READY: <b>{timeline.get('production_weeks','?')} WEEKS</b>",
            badge_s,
        ))
        for phase in _to_list(timeline.get("phases")):
            story.append(Paragraph(
                f"{phase.get('name','Phase').upper()}  ·  {phase.get('duration_weeks','?')} WEEKS", h2_s
            ))
            for d in _to_list(phase.get("deliverables")):
                story.append(Paragraph(f"• {d}", body_s))

        # ── Architecture Diagram (Mermaid source) ─────────────────────────
        mermaid = arch.get("mermaid_diagram", "")
        if mermaid:
            story.append(Paragraph("ARCHITECTURE DIAGRAM (MERMAID SOURCE)", h1_s))
            story.append(section_hr())
            story.append(Paragraph("Paste the code below at https://mermaid.live to render the interactive diagram:", small_s))
            story.append(Spacer(1, 4))
            for line in mermaid.split("\n"):
                story.append(Paragraph(line or " ", mono_s))

        doc.build(story)
        return filename
    except Exception as e:
        import traceback
        print(f"PDF generation error: {e}\n{traceback.format_exc()}")
        return None


# ─────────────────────────────────────── DOCX ───────────────────────────────


def _generate_docx(session_id: str, arch: dict, brief: dict) -> str | None:
    try:
        filename = f"architecture_{session_id[:8]}.docx"
        filepath = OUTPUT_DIR / filename

        doc = DocxDocument()

        # Set narrow margins
        for section in doc.sections:
            section.left_margin   = Inches(1)
            section.right_margin  = Inches(1)
            section.top_margin    = Inches(1)
            section.bottom_margin = Inches(1)

        def heading(text: str, level: int = 1):
            h = doc.add_heading(text, level=level)
            for run in h.runs:
                if level == 1:
                    run.font.color.rgb = RGBColor(0, 212, 255)
                elif level == 2:
                    run.font.color.rgb = RGBColor(226, 232, 240)
                else:
                    run.font.color.rgb = RGBColor(16, 185, 129)
            return h

        def body(text: str, bold: bool = False, italic: bool = False):
            p = doc.add_paragraph()
            run = p.add_run(text)
            run.font.size  = Pt(10)
            run.bold       = bold
            run.italic     = italic
            return p

        def bullet(text: str):
            p = doc.add_paragraph(style="List Bullet")
            run = p.add_run(text)
            run.font.size = Pt(10)
            return p

        def kv(label: str, value: str):
            p = doc.add_paragraph()
            r1 = p.add_run(f"{label}: ")
            r1.bold = True
            r1.font.size = Pt(10)
            r2 = p.add_run(value)
            r2.font.size = Pt(10)

        def tbl_header(table, *headers):
            hdr = table.rows[0].cells
            for i, h in enumerate(headers):
                if i < len(hdr):
                    hdr[i].text = h
                    for run in hdr[i].paragraphs[0].runs:
                        run.bold = True

        confidence = int(float(arch.get("overall_confidence", 0) or 0) * 100)

        # ── Cover ─────────────────────────────────────────────────────────
        title = doc.add_heading("ArchitectAI — Architecture Decision Report", 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER

        sub = doc.add_paragraph(brief.get("project_name", "Architecture Design"))
        sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sub.runs[0].bold = True
        sub.runs[0].font.size = Pt(16)

        meta = doc.add_paragraph(
            f"Pattern: {str(arch.get('pattern','')).upper()}  |  "
            f"Confidence: {confidence}%  |  Synthesized by 19 AI agents"
        )
        meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
        doc.add_page_break()

        # ── Executive Summary ─────────────────────────────────────────────
        heading("EXECUTIVE SUMMARY")
        body(arch.get("summary", "No summary provided."))
        why = arch.get("why_this_wins", "")
        if why:
            heading("WHY THIS ARCHITECTURE WON THE DEBATE", level=2)
            body(why)

        # ── Tech Stack — Layer by Layer ───────────────────────────────────
        heading("TECHNOLOGY STACK — LAYER BY LAYER")
        stack = arch.get("tech_stack", {})
        if stack:
            table = doc.add_table(rows=1, cols=3)
            table.style = "Table Grid"
            tbl_header(table, "LAYER", "TECHNOLOGY", "ROLE & PURPOSE")
            for k, v in stack.items():
                row = table.add_row().cells
                row[0].text = k.replace("_", " ").upper()
                row[1].text = str(v)
                row[2].text = LAYER_DESCRIPTIONS.get(k, "")

        # ── System Data Flow ──────────────────────────────────────────────
        data_flow = arch.get("data_flow")
        if data_flow:
            heading("SYSTEM DATA FLOW")
            body(data_flow)

        # ── Component Catalog ─────────────────────────────────────────────
        heading(f"COMPONENT CATALOG ({len(_to_list(arch.get('components')))} COMPONENTS)")
        components = _to_list(arch.get("components"))
        if components:
            table = doc.add_table(rows=1, cols=5)
            table.style = "Table Grid"
            tbl_header(table, "COMPONENT", "TECHNOLOGY", "API TYPE", "PURPOSE", "DEPLOYMENT")
            for c in components:
                row = table.add_row().cells
                row[0].text = c.get("name", "").upper()
                row[1].text = c.get("tech", "—")
                row[2].text = c.get("api_type", "—")
                row[3].text = c.get("purpose", "")
                row[4].text = c.get("deployment") or c.get("scale_target") or "—"

        # ── Architecture Decision Record ───────────────────────────────────
        heading("ARCHITECTURE DECISION RECORD (ADR)")
        for line in arch.get("adr", "").split("\n"):
            stripped = line.strip()
            if not stripped:
                doc.add_paragraph()
            elif stripped.startswith("### "):
                heading(stripped[4:].upper(), level=3)
            elif stripped.startswith("## "):
                heading(stripped[3:].upper(), level=2)
            elif stripped.startswith("# "):
                heading(stripped[2:].upper(), level=2)
            elif stripped.startswith("- ") or stripped.startswith("* "):
                bullet(stripped[2:])
            else:
                body(stripped)

        # ── Risk Register ──────────────────────────────────────────────────
        heading("RISK REGISTER")
        risks = _to_list(arch.get("risk_register"))
        if risks:
            table = doc.add_table(rows=1, cols=4)
            table.style = "Table Grid"
            tbl_header(table, "RISK", "SEVERITY", "LIKELIHOOD", "MITIGATION STRATEGY")
            for r in risks:
                row = table.add_row().cells
                row[0].text = r.get("risk", "")
                row[1].text = r.get("severity", "")
                row[2].text = r.get("likelihood", "—")
                row[3].text = r.get("mitigation", "")
        else:
            body("No risks identified.")

        # ── Cost Projection ────────────────────────────────────────────────
        heading("COST PROJECTION (12-MONTH TCO)")
        cost = arch.get("cost_projection", {})
        if not isinstance(cost, dict):
            cost = {}
        monthly = int(cost.get("monthly_usd", 0) or 0)
        yearly  = int(cost.get("yearly_usd", monthly * 12) or 0)
        kv("MONTHLY INFRASTRUCTURE COST", f"${monthly:,}")
        kv("ANNUAL TOTAL COST OF OWNERSHIP", f"${yearly:,}")
        breakdown = cost.get("breakdown", {})
        if isinstance(breakdown, dict) and breakdown:
            heading("COST BREAKDOWN BY CATEGORY", level=2)
            table = doc.add_table(rows=1, cols=2)
            table.style = "Table Grid"
            tbl_header(table, "CATEGORY", "ESTIMATED COST / NOTES")
            for k, v in breakdown.items():
                row = table.add_row().cells
                row[0].text = str(k).replace("_", " ").upper()
                row[1].text = str(v)
        assumptions = cost.get("assumptions", "")
        if assumptions and isinstance(assumptions, str):
            body(f"Assumptions: {assumptions}", italic=True)

        # ── Architecture Scorecard ────────────────────────────────────────────
        heading("ARCHITECTURE SCORECARD")
        scorecard = arch.get("scorecard", {})
        if isinstance(scorecard, dict) and scorecard:
            table = doc.add_table(rows=1, cols=4)
            table.style = "Table Grid"
            tbl_header(table, "DIMENSION", "SCORE", "MAX", "NOTES")
            for dim, data in scorecard.items():
                row = table.add_row().cells
                row[0].text = dim.replace("_", " ").upper()
                if isinstance(data, dict):
                    row[1].text = str(data.get("score", "—"))
                    row[2].text = str(data.get("max", 10))
                    row[3].text = data.get("notes", "")
                else:
                    row[1].text = str(data)
                    row[2].text = "10"
                    row[3].text = ""

        # ── Implementation Timeline ────────────────────────────────────────
        heading("IMPLEMENTATION TIMELINE")
        timeline = arch.get("timeline", {})
        kv("MVP TARGET",          f"{timeline.get('mvp_weeks','?')} WEEKS")
        kv("PRODUCTION-READY",    f"{timeline.get('production_weeks','?')} WEEKS")
        for phase in _to_list(timeline.get("phases")):
            heading(f"{phase.get('name','Phase').upper()} — {phase.get('duration_weeks','?')} WEEKS", level=2)
            for d in _to_list(phase.get("deliverables")):
                bullet(d)

        # ── Architecture Diagram (Mermaid) ─────────────────────────────────
        mermaid = arch.get("mermaid_diagram", "")
        if mermaid:
            heading("Architecture Diagram (Mermaid Source)")
            body("Paste the code below at https://mermaid.live to render the interactive diagram:", italic=True)
            p = doc.add_paragraph(mermaid)
            p.runs[0].font.name = "Courier New"
            p.runs[0].font.size = Pt(8)

        doc.save(str(filepath))
        return filename
    except Exception as e:
        import traceback
        print(f"DOCX generation error: {e}\n{traceback.format_exc()}")
        return None
