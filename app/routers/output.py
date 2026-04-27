"""
Output Router — Lancet output generation (tables, figures, manuscript).
"""
import os
import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import (
    get_project, get_generated_tables, get_generated_figures,
    get_statistical_analyses, get_pico_analyses, get_manuscript,
    save_manuscript, get_uploaded_files,
)
from services.stats_service import generate_demo_data, run_analysis, run_descriptive
from services.lancet_service import (
    generate_table1_html, generate_regression_table_html,
    generate_km_curve_png, generate_forest_plot_png,
    generate_cumulative_incidence_png, generate_tables_xlsx,
)
from services.manuscript_service import generate_manuscript

router = APIRouter(prefix="/api")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIGURES_DIR = os.path.join(BASE_DIR, "figures")


def _clean(obj):
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_clean(v) for v in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
    elif isinstance(obj, (np.floating,)):
        v = float(obj)
        return None if (np.isnan(v) or np.isinf(v)) else v
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    return obj


@router.get("/projects/{project_id}/tables")
async def list_tables(project_id: int):
    """List all generated tables for a project."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tables = get_generated_tables(project_id)
    return {"tables": _clean(tables), "count": len(tables)}


@router.get("/projects/{project_id}/figures")
async def list_figures(project_id: int):
    """List all generated figures for a project."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    figures = get_generated_figures(project_id)
    return {"figures": _clean(figures), "count": len(figures)}


@router.get("/figures/{filename}")
async def serve_figure(filename: str):
    """Serve a generated figure file."""
    filepath = os.path.join(FIGURES_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Figure not found")
    return FileResponse(filepath, media_type="image/png")


# ---- Manuscript generation ----

class ManuscriptRequest(BaseModel):
    project_title: Optional[str] = None
    use_latest_pico: bool = True
    use_latest_analysis: bool = True
    research_type: Optional[str] = None


@router.post("/projects/{project_id}/manuscript")
async def generate_project_manuscript(project_id: int, request: ManuscriptRequest = None):
    """Generate a Lancet-format manuscript for the project."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_title = (request.project_title if request else None) or project.get("title", "Untitled Research Project")
    research_type = (request.research_type if request else None) or project.get("research_type", "observational")

    # Get latest PICO analysis
    pico_analyses = get_pico_analyses(project_id)
    if not pico_analyses:
        raise HTTPException(status_code=400, detail="No PICO analysis found. Run PICO analysis first.")

    latest_pico = pico_analyses[0]
    pico_dict = {
        "population": latest_pico.get("population", ""),
        "intervention": latest_pico.get("intervention", ""),
        "comparison": latest_pico.get("comparison", ""),
        "outcome": latest_pico.get("outcome", ""),
        "exposure": latest_pico.get("exposure", ""),
        "dataset_suggestions": latest_pico.get("dataset_suggestions", []),
    }

    # Get latest statistical analysis
    analyses = get_statistical_analyses(project_id)
    if analyses:
        analysis_results = analyses[0].get("results_json", {})
    else:
        # Run a default analysis
        data = generate_demo_data("cox_regression")
        analysis_results = run_analysis("cox_regression", data)

    # Get descriptive results if available
    if analyses:
        for a in analyses:
            if a.get("analysis_type") in ["descriptive", "baseline"]:
                analysis_results_for_descriptive = a.get("results_json", {})
                break
        else:
            analysis_results_for_descriptive = analysis_results
    else:
        analysis_results_for_descriptive = analysis_results

    # Generate manuscript
    manuscript_content = generate_manuscript(
        project_title, pico_dict, analysis_results,
        analysis_results_for_descriptive, research_type
    )

    # Save to database
    saved = save_manuscript(
        project_id,
        manuscript_content["title"],
        manuscript_content["abstract"],
        manuscript_content["introduction"],
        manuscript_content["methods"],
        manuscript_content["results"],
        manuscript_content["discussion"],
        manuscript_content["references"],
    )

    return {"manuscript": saved}


@router.get("/projects/{project_id}/manuscript")
async def get_project_manuscript(project_id: int):
    """Get the latest manuscript for a project."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    manuscript = get_manuscript(project_id)
    if not manuscript:
        raise HTTPException(status_code=404, detail="No manuscript found. Generate one first.")

    return {"manuscript": manuscript}
