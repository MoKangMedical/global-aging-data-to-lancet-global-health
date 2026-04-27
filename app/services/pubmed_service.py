"""
PubMed Literature Search Service.
Uses NCBI E-utilities API to search and retrieve citations.
"""
import httpx
import asyncio
from typing import Dict, List, Any, Optional
from urllib.parse import quote_plus

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"

# Default search terms for common aging research topics
DEFAULT_AGING_TERMS = [
    "global aging", "older adults health", "multimorbidity elderly",
    "cognitive decline aging", "disability elderly", "survival aging",
    "health inequality aging", "social determinants aging",
]


async def search_pubmed(query: str, max_results: int = 20, sort: str = "relevance") -> Dict[str, Any]:
    """
    Search PubMed for articles matching query.
    Returns list of results with PMID, title, authors, journal, year.
    """
    params = {
        "db": "pubmed",
        "term": query,
        "retmax": max_results,
        "retmode": "json",
        "sort": sort,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Search for IDs
        try:
            resp = await client.get(ESEARCH_URL, params=params)
            resp.raise_for_status()
            search_data = resp.json()
        except Exception as e:
            return {
                "query": query,
                "count": 0,
                "results": [],
                "error": str(e),
            }

        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        count = int(search_data.get("esearchresult", {}).get("count", 0))

        if not id_list:
            return {
                "query": query,
                "count": 0,
                "results": [],
            }

        # Step 2: Fetch summaries for these IDs
        summary_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "json",
        }

        try:
            resp2 = await client.get(ESUMMARY_URL, params=summary_params)
            resp2.raise_for_status()
            summary_data = resp2.json()
        except Exception as e:
            return {
                "query": query,
                "count": count,
                "results": [],
                "error": str(e),
            }

        results = []
        result_data = summary_data.get("result", {})
        for pmid in id_list:
            article = result_data.get(pmid, {})
            if not article or not isinstance(article, dict):
                continue

            # Extract authors
            authors_list = article.get("authors", [])
            authors_str = ", ".join(
                [a.get("name", "") for a in authors_list if a.get("name")]
            )

            # Extract publication date
            pub_date = article.get("pubdate", "")
            year = pub_date.split()[0] if pub_date else ""

            results.append({
                "pmid": pmid,
                "title": article.get("title", ""),
                "authors": authors_str,
                "journal": article.get("fulljournalname", article.get("source", "")),
                "year": year,
                "doi": article.get("elocationid", ""),
                "sort_key": article.get("sortpubdate", ""),
            })

        return {
            "query": query,
            "count": count,
            "results": results,
        }


async def fetch_article_details(pmids: List[str]) -> List[Dict[str, Any]]:
    """Fetch detailed information for specific PMIDs."""
    if not pmids:
        return []

    async with httpx.AsyncClient(timeout=30.0) as client:
        params = {
            "db": "pubmed",
            "id": ",".join(pmids),
            "retmode": "json",
        }
        try:
            resp = await client.get(ESUMMARY_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return []

        results = []
        result_data = data.get("result", {})
        for pmid in pmids:
            article = result_data.get(pmid, {})
            if not article or not isinstance(article, dict):
                continue

            authors_list = article.get("authors", [])
            authors_str = ", ".join([a.get("name", "") for a in authors_list if a.get("name")])

            results.append({
                "pmid": pmid,
                "title": article.get("title", ""),
                "authors": authors_str,
                "journal": article.get("fulljournalname", article.get("source", "")),
                "year": article.get("pubdate", "").split()[0] if article.get("pubdate") else "",
                "doi": article.get("elocationid", ""),
                "volume": article.get("volume", ""),
                "issue": article.get("issue", ""),
                "pages": article.get("pages", ""),
            })

        return results


async def search_aging_literature(topic: str, datasets: List[str] = None, max_results: int = 15) -> Dict[str, Any]:
    """
    Search PubMed specifically for aging research literature.
    Constructs optimized search queries based on topic and datasets.
    """
    # Build search query
    terms = [topic]

    if datasets:
        dataset_terms = []
        for ds in datasets:
            ds_upper = ds.upper()
            if ds_upper == "HRS":
                dataset_terms.append('"Health and Retirement Study"')
            elif ds_upper == "CHARLS":
                dataset_terms.append('"China Health and Retirement"')
            elif ds_upper == "ELSA":
                dataset_terms.append('"English Longitudinal Study of Ageing"')
            elif ds_upper == "SHARE":
                dataset_terms.append('"Survey of Health Ageing and Retirement in Europe"')
            elif ds_upper == "LASI":
                dataset_terms.append('"Longitudinal Ageing Study in India"')
            elif ds_upper == "MHAS":
                dataset_terms.append('"Mexican Health and Aging Study"')
            else:
                dataset_terms.append(ds)

        if dataset_terms:
            terms.append("(" + " OR ".join(dataset_terms) + ")")

    # Add aging filter
    terms.append('("older adults" OR "aged" OR "aging" OR "elderly")')

    query = " AND ".join(terms)
    return await search_pubmed(query, max_results=max_results)
