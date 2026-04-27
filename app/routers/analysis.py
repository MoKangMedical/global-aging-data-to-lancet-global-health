"""
Analysis Router — Additional statistical analysis endpoints.
"""
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_project, get_statistical_analyses
from services.stats_service import generate_demo_data, run_analysis

router = APIRouter(prefix="/api")


class QuickAnalysisRequest(BaseModel):
    analysis_type: str = "kaplan_meier"
    n_samples: int = 500
    parameters: dict = {}


@router.post("/projects/{project_id}/analyze/quick")
async def quick_analysis(project_id: int, request: QuickAnalysisRequest):
    """
    Run a quick analysis with generated demo data.
    Useful for testing and demonstration.
    """
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Generate data
    data = generate_demo_data(request.analysis_type, n=request.n_samples)

    # Run analysis
    results = run_analysis(request.analysis_type, data, request.parameters)

    return {
        "analysis_type": request.analysis_type,
        "n_samples": request.n_samples,
        "results": results,
    }


@router.get("/analysis/types")
async def list_analysis_types():
    """List all available statistical analysis types."""
    return {
        "analysis_types": [
            {
                "id": "kaplan_meier",
                "name": "Kaplan-Meier Survival Analysis",
                "description": "Non-parametric survival function estimation with log-rank test",
                "category": "survival",
                "outputs": ["survival_table", "km_curve", "logrank_test"],
            },
            {
                "id": "cox_regression",
                "name": "Cox Proportional Hazards Regression",
                "description": "Semi-parametric hazard regression with covariates",
                "category": "survival",
                "outputs": ["hazard_ratios", "forest_plot", "concordance"],
            },
            {
                "id": "fine_gray",
                "name": "Fine-Gray Competing Risks",
                "description": "Subdistribution hazard model accounting for competing events",
                "category": "survival",
                "outputs": ["subdistribution_hr", "cumulative_incidence"],
            },
            {
                "id": "logistic_regression",
                "name": "Logistic Regression",
                "description": "Binary outcome regression with odds ratios",
                "category": "regression",
                "outputs": ["odds_ratios", "forest_plot", "goodness_of_fit"],
            },
            {
                "id": "linear_regression",
                "name": "Linear Regression (OLS)",
                "description": "Continuous outcome regression with coefficients",
                "category": "regression",
                "outputs": ["coefficients", "r_squared", "diagnostics"],
            },
            {
                "id": "descriptive",
                "name": "Descriptive Statistics (Table 1)",
                "description": "Baseline characteristics summary by exposure group",
                "category": "descriptive",
                "outputs": ["table1", "summary_stats"],
            },
        ]
    }
