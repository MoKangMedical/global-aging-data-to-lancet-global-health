"""
Submission Router — Submission package generation and download.
"""
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import (
    get_project, get_manuscript, get_generated_tables,
    get_generated_figures, get_statistical_analyses,
)
from services.submission_service import generate_submission_package
from services.lancet_service import generate_tables_xlsx

router = APIRouter(prefix="/api")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIGURES_DIR = os.path.join(BASE_DIR, "figures")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")


@router.post("/projects/{project_id}/submission")
async def generate_submission(project_id: int):
    """Generate a complete submission package (ZIP)."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check manuscript exists
    manuscript = get_manuscript(project_id)
    if not manuscript:
        raise HTTPException(
            status_code=400,
            detail="No manuscript found. Generate a manuscript first."
        )

    # Collect figure paths
    figures = get_generated_figures(project_id)
    figure_paths = []
    for fig in figures:
        fp = fig.get("figure_path", "")
        if fp:
            full_path = os.path.join(FIGURES_DIR, fp)
            if os.path.exists(full_path):
                figure_paths.append(full_path)

    # Get tables xlsx path if it exists
    tables_xlsx = os.path.join(OUTPUTS_DIR, f"tables_p{project_id}.xlsx")
    if not os.path.exists(tables_xlsx):
        # Try to regenerate from available analysis data
        analyses = get_statistical_analyses(project_id)
        if analyses:
            baseline = analyses[0].get("results_json", {})
            reg_results = baseline
            table1_html = ""
            reg_html = ""
            generate_tables_xlsx(project_id, table1_html, reg_html, baseline)

    # Generate the submission package
    manuscript_dict = {
        "title": manuscript.get("title", ""),
        "abstract": manuscript.get("abstract", ""),
        "introduction": manuscript.get("introduction", ""),
        "methods": manuscript.get("methods", ""),
        "results": manuscript.get("results", ""),
        "discussion": manuscript.get("discussion", ""),
        "references": manuscript.get("references", ""),
    }

    zip_path = generate_submission_package(
        project_id,
        project.get("title", "Untitled"),
        manuscript_dict,
        tables_xlsx if os.path.exists(tables_xlsx) else None,
        figure_paths,
    )

    return {
        "message": "Submission package generated successfully",
        "zip_path": os.path.basename(zip_path),
        "files_included": {
            "manuscript": "manuscript.docx",
            "tables": "tables.xlsx",
            "figures": [os.path.basename(fp) for fp in figure_paths],
            "readme": "README.txt",
        },
    }


@router.get("/projects/{project_id}/submission/download")
async def download_submission(project_id: int):
    """Download the submission ZIP package."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Find the most recent submission ZIP for this project
    import glob
    pattern = os.path.join(OUTPUTS_DIR, f"submission_p{project_id}_*.zip")
    zip_files = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)

    if not zip_files:
        raise HTTPException(
            status_code=404,
            detail="No submission package found. Generate one first."
        )

    zip_path = zip_files[0]
    filename = os.path.basename(zip_path)

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
