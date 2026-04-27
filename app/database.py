"""
SQLite database setup and models for the Global Aging Data to Lancet Global Health platform.
"""
import sqlite3
import os
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "app.db")

os.makedirs(DATA_DIR, exist_ok=True)


def get_db() -> sqlite3.Connection:
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            research_type TEXT DEFAULT 'observational',
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS uploaded_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            file_type TEXT NOT NULL,
            extracted_text TEXT DEFAULT '',
            uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS pico_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            population TEXT DEFAULT '',
            intervention TEXT DEFAULT '',
            comparison TEXT DEFAULT '',
            outcome TEXT DEFAULT '',
            exposure TEXT DEFAULT '',
            dataset_suggestions TEXT DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS statistical_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            analysis_type TEXT NOT NULL,
            parameters TEXT DEFAULT '{}',
            results_json TEXT DEFAULT '{}',
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS generated_tables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            analysis_id INTEGER,
            table_type TEXT NOT NULL,
            table_data TEXT DEFAULT '{}',
            lancet_formatted TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (analysis_id) REFERENCES statistical_analyses(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS generated_figures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            analysis_id INTEGER,
            figure_type TEXT NOT NULL,
            figure_path TEXT NOT NULL,
            caption TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (analysis_id) REFERENCES statistical_analyses(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS manuscripts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            title TEXT DEFAULT '',
            abstract TEXT DEFAULT '',
            introduction TEXT DEFAULT '',
            methods TEXT DEFAULT '',
            results TEXT DEFAULT '',
            discussion TEXT DEFAULT '',
            references TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS citations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            manuscript_id INTEGER NOT NULL,
            pmid TEXT DEFAULT '',
            title TEXT DEFAULT '',
            authors TEXT DEFAULT '',
            journal TEXT DEFAULT '',
            year TEXT DEFAULT '',
            doi TEXT DEFAULT '',
            FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
        );
    """)

    conn.commit()
    conn.close()


# ---- Helper functions for CRUD operations ----

def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert a sqlite3.Row to a dictionary."""
    if row is None:
        return {}
    return dict(row)


def rows_to_list(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    """Convert a list of sqlite3.Row to a list of dicts."""
    return [dict(r) for r in rows]


# Projects
def create_project(title: str, description: str = "", research_type: str = "observational") -> Dict[str, Any]:
    conn = get_db()
    now = datetime.utcnow().isoformat()
    cursor = conn.execute(
        "INSERT INTO projects (title, description, research_type, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)",
        (title, description, research_type, now, now)
    )
    conn.commit()
    project_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


def get_projects() -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    conn.close()
    return rows_to_list(rows)


def get_project(project_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    return row_to_dict(row) if row else None


def delete_project(project_id: int) -> bool:
    conn = get_db()
    cursor = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def update_project_status(project_id: int, status: str) -> bool:
    conn = get_db()
    now = datetime.utcnow().isoformat()
    cursor = conn.execute(
        "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
        (status, now, project_id)
    )
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated


# Uploaded files
def save_uploaded_file(project_id: int, filename: str, filepath: str, file_type: str, extracted_text: str = "") -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO uploaded_files (project_id, filename, filepath, file_type, extracted_text) VALUES (?, ?, ?, ?, ?)",
        (project_id, filename, filepath, file_type, extracted_text)
    )
    conn.commit()
    file_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM uploaded_files WHERE id = ?", (file_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


def get_uploaded_files(project_id: int) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM uploaded_files WHERE project_id = ? ORDER BY uploaded_at DESC", (project_id,)).fetchall()
    conn.close()
    return rows_to_list(rows)


# PICO analyses
def save_pico_analysis(project_id: int, population: str, intervention: str, comparison: str, outcome: str, exposure: str, dataset_suggestions: List[str]) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO pico_analyses (project_id, population, intervention, comparison, outcome, exposure, dataset_suggestions) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (project_id, population, intervention, comparison, outcome, exposure, json.dumps(dataset_suggestions))
    )
    conn.commit()
    pico_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM pico_analyses WHERE id = ?", (pico_id,)).fetchone()
    conn.close()
    result = row_to_dict(row)
    result["dataset_suggestions"] = json.loads(result["dataset_suggestions"])
    return result


def get_pico_analyses(project_id: int) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM pico_analyses WHERE project_id = ? ORDER BY created_at DESC", (project_id,)).fetchall()
    conn.close()
    results = rows_to_list(rows)
    for r in results:
        r["dataset_suggestions"] = json.loads(r["dataset_suggestions"])
    return results


# Statistical analyses
def save_statistical_analysis(project_id: int, analysis_type: str, parameters: Dict, results: Dict, status: str = "completed") -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO statistical_analyses (project_id, analysis_type, parameters, results_json, status) VALUES (?, ?, ?, ?, ?)",
        (project_id, analysis_type, json.dumps(parameters), json.dumps(results), status)
    )
    conn.commit()
    analysis_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM statistical_analyses WHERE id = ?", (analysis_id,)).fetchone()
    conn.close()
    result = row_to_dict(row)
    result["parameters"] = json.loads(result["parameters"])
    result["results_json"] = json.loads(result["results_json"])
    return result


def get_statistical_analyses(project_id: int) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM statistical_analyses WHERE project_id = ? ORDER BY created_at DESC", (project_id,)).fetchall()
    conn.close()
    results = rows_to_list(rows)
    for r in results:
        r["parameters"] = json.loads(r["parameters"])
        r["results_json"] = json.loads(r["results_json"])
    return results


# Generated tables
def save_generated_table(project_id: int, analysis_id: Optional[int], table_type: str, table_data: Dict, lancet_formatted: str) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO generated_tables (project_id, analysis_id, table_type, table_data, lancet_formatted) VALUES (?, ?, ?, ?, ?)",
        (project_id, analysis_id, table_type, json.dumps(table_data), lancet_formatted)
    )
    conn.commit()
    table_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM generated_tables WHERE id = ?", (table_id,)).fetchone()
    conn.close()
    result = row_to_dict(row)
    result["table_data"] = json.loads(result["table_data"])
    return result


def get_generated_tables(project_id: int) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM generated_tables WHERE project_id = ? ORDER BY created_at DESC", (project_id,)).fetchall()
    conn.close()
    results = rows_to_list(rows)
    for r in results:
        r["table_data"] = json.loads(r["table_data"])
    return results


# Generated figures
def save_generated_figure(project_id: int, analysis_id: Optional[int], figure_type: str, figure_path: str, caption: str) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO generated_figures (project_id, analysis_id, figure_type, figure_path, caption) VALUES (?, ?, ?, ?, ?)",
        (project_id, analysis_id, figure_type, figure_path, caption)
    )
    conn.commit()
    figure_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM generated_figures WHERE id = ?", (figure_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


def get_generated_figures(project_id: int) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM generated_figures WHERE project_id = ? ORDER BY created_at DESC", (project_id,)).fetchall()
    conn.close()
    return rows_to_list(rows)


# Manuscripts
def save_manuscript(project_id: int, title: str, abstract: str, introduction: str, methods: str, results: str, discussion: str, references: str) -> Dict[str, Any]:
    conn = get_db()
    now = datetime.utcnow().isoformat()
    # Check if manuscript exists for project
    existing = conn.execute("SELECT id FROM manuscripts WHERE project_id = ?", (project_id,)).fetchone()
    if existing:
        conn.execute(
            "UPDATE manuscripts SET title=?, abstract=?, introduction=?, methods=?, results=?, discussion=?, references=?, updated_at=? WHERE project_id=?",
            (title, abstract, introduction, methods, results, discussion, references, now, project_id)
        )
        conn.commit()
        manuscript_id = existing["id"]
    else:
        cursor = conn.execute(
            "INSERT INTO manuscripts (project_id, title, abstract, introduction, methods, results, discussion, references, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (project_id, title, abstract, introduction, methods, results, discussion, references, now, now)
        )
        conn.commit()
        manuscript_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM manuscripts WHERE id = ?", (manuscript_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


def get_manuscript(project_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute("SELECT * FROM manuscripts WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1", (project_id,)).fetchone()
    conn.close()
    return row_to_dict(row) if row else None


# Citations
def save_citation(manuscript_id: int, pmid: str, title: str, authors: str, journal: str, year: str, doi: str) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO citations (manuscript_id, pmid, title, authors, journal, year, doi) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (manuscript_id, pmid, title, authors, journal, year, doi)
    )
    conn.commit()
    citation_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM citations WHERE id = ?", (citation_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


def get_citations(manuscript_id: int) -> List[Dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM citations WHERE manuscript_id = ? ORDER BY id", (manuscript_id,)).fetchall()
    conn.close()
    return rows_to_list(rows)
