"""
Projects Router — CRUD endpoints for research projects.
Also handles file upload, PICO analysis, and analysis execution.
"""
import os
import json
import shutil
from typing import Optional, List
from datetime import datetime
import numpy as np

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import (
    create_project, get_projects, get_project, delete_project,
    update_project_status, save_uploaded_file, get_uploaded_files,
    save_pico_analysis, get_pico_analyses, save_statistical_analysis,
    get_statistical_analyses, save_generated_table, get_generated_tables,
    save_generated_figure, get_generated_figures,
)
from services.pico_service import extract_pico
from services.stats_service import generate_demo_data, run_analysis
from services.lancet_service import (
    generate_table1_html, generate_regression_table_html,
    generate_km_curve_png, generate_forest_plot_png,
    generate_cumulative_incidence_png, generate_tables_xlsx,
)

router = APIRouter(prefix="/api")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
FIGURES_DIR = os.path.join(BASE_DIR, "figures")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(FIGURES_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)


def _clean_for_json(obj):
    """Recursively clean NaN/inf values for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_clean_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        v = float(obj)
        if np.isnan(v) or np.isinf(v):
            return None
        return v
    elif isinstance(obj, np.ndarray):
        return _clean_for_json(obj.tolist())
    return obj


# ---- Pydantic models ----

class ProjectCreate(BaseModel):
    title: str
    description: str = ""
    research_type: str = "observational"


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    research_type: Optional[str] = None


class PICORequest(BaseModel):
    text: str


class AnalysisRequest(BaseModel):
    analysis_type: str = "kaplan_meier"
    parameters: dict = {}


# ---- Project CRUD ----

@router.get("/projects")
async def list_projects():
    """List all projects."""
    projects = get_projects()
    return {"projects": projects, "count": len(projects)}


@router.post("/projects")
async def create_new_project(data: ProjectCreate):
    """Create a new research project."""
    project = create_project(data.title, data.description, data.research_type)
    return {"project": project}


@router.get("/projects/{project_id}")
async def get_project_detail(project_id: int):
    """Get project details with associated data."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Attach related data
    project["uploaded_files"] = get_uploaded_files(project_id)
    project["pico_analyses"] = get_pico_analyses(project_id)
    project["statistical_analyses"] = get_statistical_analyses(project_id)
    project["generated_tables"] = get_generated_tables(project_id)
    project["generated_figures"] = get_generated_figures(project_id)

    return {"project": project}


@router.delete("/projects/{project_id}")
async def delete_existing_project(project_id: int):
    """Delete a project and all associated data."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Clean up uploaded files
    project_upload_dir = os.path.join(UPLOADS_DIR, str(project_id))
    if os.path.exists(project_upload_dir):
        shutil.rmtree(project_upload_dir, ignore_errors=True)

    # Clean up generated figures for this project
    for f in os.listdir(FIGURES_DIR):
        if f.startswith(f"p{project_id}_") or f.endswith(f"_p{project_id}_"):
            try:
                os.remove(os.path.join(FIGURES_DIR, f))
            except OSError:
                pass

    delete_project(project_id)
    return {"message": "Project deleted", "project_id": project_id}


# ---- File Upload ----

@router.post("/projects/{project_id}/upload")
async def upload_protocol(project_id: int, file: UploadFile = File(...)):
    """Upload a research protocol file (PDF, DOCX, TXT)."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc", ".txt", ".md", ".rtf"]:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    # Save file
    project_dir = os.path.join(UPLOADS_DIR, str(project_id))
    os.makedirs(project_dir, exist_ok=True)

    file_path = os.path.join(project_dir, filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Extract text
    extracted_text = _extract_text_from_file(file_path, ext)

    # Save to database
    file_type = ext.lstrip(".")
    saved = save_uploaded_file(project_id, filename, file_path, file_type, extracted_text)

    return {
        "message": "File uploaded successfully",
        "file": saved,
        "extracted_text_length": len(extracted_text),
    }


def _extract_text_from_file(filepath: str, ext: str) -> str:
    """Extract text content from uploaded file."""
    if ext in [".txt", ".md"]:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    elif ext in [".docx", ".doc"]:
        try:
            from docx import Document
            doc = Document(filepath)
            return "\n".join([p.text for p in doc.paragraphs])
        except Exception:
            return f"[Could not extract text from {os.path.basename(filepath)}. File was saved.]"
    elif ext == ".pdf":
        try:
            import subprocess
            result = subprocess.run(
                ["pdftotext", filepath, "-"],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout
        except Exception:
            pass
        return f"[PDF file saved. Text extraction requires pdftotext or PyPDF2.]"
    return ""


# ---- PICO Analysis ----

@router.post("/projects/{project_id}/pico")
async def run_pico_analysis(project_id: int, request: PICORequest = None):
    """Run PICO framework analysis on text."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    analysis_text = ""
    if request and request.text:
        analysis_text = request.text
    else:
        # Try to use uploaded file text
        files = get_uploaded_files(project_id)
        if files:
            analysis_text = files[0].get("extracted_text", "")
        if not analysis_text:
            raise HTTPException(status_code=400, detail="No text provided and no uploaded files with extractable text")

    result = extract_pico(analysis_text)

    # Save to database
    saved = save_pico_analysis(
        project_id,
        result["population"],
        result["intervention"],
        result["comparison"],
        result["outcome"],
        result["exposure"],
        result["dataset_suggestions"],
    )

    return {"pico_analysis": saved, "research_type": result.get("research_type", "observational")}


@router.get("/projects/{project_id}/pico")
async def get_pico_results(project_id: int):
    """Get PICO analysis results for a project."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pico = get_pico_analyses(project_id)
    return {"pico_analyses": pico}


# ---- Statistical Analysis ----

@router.post("/projects/{project_id}/analyze")
async def run_statistical_analysis(project_id: int, request: AnalysisRequest):
    """Run statistical analysis on project data."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    analysis_type = request.analysis_type
    parameters = request.parameters

    # Generate demo data for the analysis
    data = generate_demo_data(analysis_type)

    # Run the analysis
    results = run_analysis(analysis_type, data, parameters)
    results = _clean_for_json(results)

    # Save analysis to database
    saved = save_statistical_analysis(project_id, analysis_type, parameters, results)

    # Generate associated tables and figures
    _generate_analysis_outputs(project_id, saved["id"], analysis_type, data, results)

    return {"analysis": _clean_for_json(saved)}


def _generate_analysis_outputs(project_id: int, analysis_id: int, analysis_type: str, data: dict, results: dict):
    """Generate tables and figures for a completed analysis."""
    try:
        # Generate Table 1 (baseline characteristics) for any analysis
        baseline = run_analysis("descriptive", data)
        table1_html = generate_table1_html(baseline)
        save_generated_table(project_id, analysis_id, "baseline", baseline, table1_html)

        # Generate regression table
        if "covariates" in results:
            reg_html = generate_regression_table_html(results)
            save_generated_table(project_id, analysis_id, "regression", results, reg_html)

        # Generate figures based on analysis type
        if analysis_type in ["kaplan_meier", "survival", "cox_regression"]:
            km_path = generate_km_curve_png(results, project_id, analysis_id)
            if km_path:
                save_generated_figure(
                    project_id, analysis_id, "kaplan_meier",
                    os.path.basename(km_path),
                    "Kaplan-Meier survival curves by exposure group"
                )

            forest_path = generate_forest_plot_png(results, project_id, analysis_id)
            if forest_path:
                save_generated_figure(
                    project_id, analysis_id, "forest_plot",
                    os.path.basename(forest_path),
                    "Forest plot of adjusted hazard ratios"
                )

        if analysis_type in ["fine_gray", "survival"]:
            ci_path = generate_cumulative_incidence_png(results, project_id, analysis_id)
            if ci_path:
                save_generated_figure(
                    project_id, analysis_id, "cumulative_incidence",
                    os.path.basename(ci_path),
                    "Cumulative incidence functions (competing risks)"
                )

        if analysis_type in ["kaplan_meier", "cox_regression", "fine_gray"]:
            # Also generate KM and forest for these types
            if analysis_type == "fine_gray":
                km_path = generate_km_curve_png(results, project_id, analysis_id)
                if km_path:
                    save_generated_figure(
                        project_id, analysis_id, "kaplan_meier",
                        os.path.basename(km_path),
                        "Kaplan-Meier survival curves"
                    )
                forest_path = generate_forest_plot_png(results, project_id, analysis_id)
                if forest_path:
                    save_generated_figure(
                        project_id, analysis_id, "forest_plot",
                        os.path.basename(forest_path),
                        "Forest plot of subdistribution hazard ratios"
                    )

        # Generate Excel tables
        reg_html = generate_regression_table_html(results) if "covariates" in results else ""
        generate_tables_xlsx(project_id, table1_html, reg_html, baseline)

    except Exception as e:
        print(f"Warning: Could not generate all outputs: {e}")


@router.get("/projects/{project_id}/analyses")
async def list_analyses(project_id: int):
    """List all statistical analyses for a project."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    analyses = get_statistical_analyses(project_id)
    return {"analyses": analyses, "count": len(analyses)}
