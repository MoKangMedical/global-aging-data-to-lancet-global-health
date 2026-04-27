"""
Global Aging Data to Lancet Global Health — Main FastAPI Server
Research automation platform for transforming aging data into
publication-ready Lancet Global Health papers.

Run with: python app/server.py
"""
import os
import sys

# Ensure app directory is in path
APP_DIR = os.path.dirname(os.path.abspath(__file__))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import projects, analysis, output, submission
from services import pubmed_service

import uvicorn

# ---- App setup ----
app = FastAPI(
    title="Global Aging Data to Lancet Global Health",
    description="Research automation platform that transforms Global Aging Data into Lancet Global Health publication-ready papers.",
    version="1.0.0",
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Mount routers ----
app.include_router(projects.router)
app.include_router(analysis.router)
app.include_router(output.router)
app.include_router(submission.router)

# ---- Static files ----
STATIC_DIR = os.path.join(APP_DIR, "static")
FIGURES_DIR = os.path.join(APP_DIR, "figures")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(FIGURES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/figures", StaticFiles(directory=FIGURES_DIR), name="figures")

# ---- Startup event ----
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()
    print("=" * 60)
    print("  Global Aging Data to Lancet Global Health")
    print("  Server running on http://0.0.0.0:8000")
    print("=" * 60)


# ---- Health check ----
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Global Aging Data to Lancet Global Health",
        "version": "1.0.0",
        "endpoints": {
            "projects": "/api/projects",
            "analysis": "/api/projects/{id}/analyze",
            "manuscript": "/api/projects/{id}/manuscript",
            "submission": "/api/projects/{id}/submission",
            "pubmed": "/api/pubmed/search?q=keyword",
        },
    }


# ---- PubMed search endpoint ----
@app.get("/api/pubmed/search")
async def search_pubmed(q: str = "", max_results: int = 20, sort: str = "relevance"):
    """Search PubMed for aging-related literature."""
    if not q:
        return {"query": "", "count": 0, "results": [], "error": "Empty query"}

    result = await pubmed_service.search_pubmed(q, max_results=max_results, sort=sort)
    return result


# ---- Frontend serving ----
TEMPLATES_DIR = os.path.join(APP_DIR, "templates")

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Serve the frontend HTML application."""
    html_path = os.path.join(TEMPLATES_DIR, "app.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content=_get_fallback_html())


def _get_fallback_html():
    """Fallback HTML if template file doesn't exist."""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Global Aging Data to Lancet Global Health</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #1a237e, #283593); color: white; padding: 2rem; text-align: center; }
        .header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
        .header p { opacity: 0.85; font-size: 0.95rem; }
        .container { max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
        .card { background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card h2 { color: #1a237e; margin-bottom: 0.5rem; }
        .status { color: #4caf50; font-weight: bold; }
        .btn { display: inline-block; padding: 0.5rem 1rem; background: #1a237e; color: white; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; margin: 0.25rem; }
        .btn:hover { background: #283593; }
        .api-list { list-style: none; padding: 0; }
        .api-list li { padding: 0.3rem 0; border-bottom: 1px solid #eee; }
        .api-list code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Global Aging Data → Lancet Global Health</h1>
        <p>Research automation platform for aging studies</p>
    </div>
    <div class="container">
        <div class="card">
            <h2>Server Status</h2>
            <p class="status">● Running on port 8000</p>
            <p style="margin-top:0.5rem">API documentation available at <a href="/docs">/docs</a></p>
        </div>
        <div class="card">
            <h2>Quick Start</h2>
            <p>1. Create a new project<br>2. Upload a research protocol<br>3. Run PICO analysis<br>4. Execute statistical analysis<br>5. Generate manuscript<br>6. Create submission package</p>
            <a href="/docs" class="btn" style="margin-top:1rem">Open API Docs</a>
        </div>
    </div>
</body>
</html>
"""


# ---- Main entry point ----
if __name__ == "__main__":
    init_db()
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
