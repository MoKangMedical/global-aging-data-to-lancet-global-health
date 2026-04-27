"""
PICO Framework Extraction Service.
Extracts Population, Intervention/Exposure, Comparison, Outcome from research protocols.
Uses keyword matching and pattern recognition.
"""
import re
from typing import Dict, List, Tuple, Optional


# Keywords associated with each PICO element for aging research
POPULATION_KEYWORDS = [
    "older adults", "elderly", "aged", "seniors", "geriatric", "aging population",
    "middle-aged", "adults aged", "years and older", "over 50", "over 60", "over 65",
    "over 70", "retirement age", "postmenopausal", "older men", "older women",
    "community-dwelling", "institutionalized", "nursing home", "long-term care",
    "chronic disease", "multimorbidity", "frail", "cognitively impaired",
    "dementia", "alzheimer", "parkinson", "diabetes", "hypertension",
    "cardiovascular", "cancer survivors", "stroke survivors", "hip fracture",
    "low income", "high income", "middle income", "developing countries",
    "developed countries", "sub-saharan africa", "south asia", "east asia",
    "europe", "united states", "china", "india", "brazil", "mexico",
    "rural", "urban", "low and middle income", "LMIC",
]

INTERVENTION_KEYWORDS = [
    "intervention", "treatment", "therapy", "program", "exercise program",
    "physical activity", "dietary intervention", "nutritional supplement",
    "medication", "drug", "pharmacological", "surgical", "rehabilitation",
    "cognitive training", "social support", "community-based", "home-based",
    "telehealth", "digital health", "mobile health", "mhealth",
    "multicomponent", "lifestyle modification", "behavioral intervention",
    "education program", "self-management", "care coordination",
    "preventive", "screening", "vaccination", "immunization",
    "policy", "insurance", "pension", "retirement",
    "smoking cessation", "alcohol reduction", "fall prevention",
    "assistive technology", "prosthetic", "orthotic",
]

EXPOSURE_KEYWORDS = [
    "exposure", "risk factor", "associated with", "linked to", "correlate",
    "predictor", "determinant", "social determinant", "environmental factor",
    "air pollution", "particulate matter", "PM2.5", "noise", "green space",
    "socioeconomic status", "education level", "income", "wealth",
    "marital status", "living alone", "social isolation", "loneliness",
    "social network", "social participation", "volunteer",
    "physical inactivity", "sedentary", "smoking", "alcohol consumption",
    "obesity", "BMI", "body mass index", "waist circumference",
    "sleep duration", "sleep quality", "insomnia",
    "caregiver burden", "discrimination", "migration", "immigration",
    "neighborhood", "built environment", "transportation",
    "internet use", "digital literacy", "retirement timing",
]

COMPARISON_KEYWORDS = [
    "compared to", "compared with", "versus", "vs", "control group",
    "reference group", "placebo", "usual care", "standard care",
    "no intervention", "no treatment", "pre-intervention", "baseline",
    "non-exposed", "unexposed", "lower", "higher", "quartile",
    "tertile", "median split", "above", "below",
    "young adults", "younger", "non-elderly",
    "high income country", "low income country",
    "intervention group", "treatment group", "exposed group",
]

OUTCOME_KEYWORDS = [
    "outcome", "endpoint", "primary outcome", "secondary outcome",
    "mortality", "death", "survival", "life expectancy", "healthy life expectancy",
    "disability", "ADL", "IADL", "activities of daily living",
    "functional limitation", "mobility", "physical function",
    "cognitive function", "cognitive decline", "dementia", "MMSE",
    "depression", "anxiety", "mental health", "well-being", "quality of life",
    "EQ-5D", "SF-36", "health status", "self-rated health",
    "hospitalization", "emergency", "healthcare utilization", "health service use",
    "healthcare cost", "out-of-pocket", "catastrophic health expenditure",
    "falls", "fracture", "osteoporosis", "sarcopenia",
    "cardiovascular event", "stroke", "myocardial infarction",
    "diabetes", "chronic disease onset", "multimorbidity",
    "pain", "chronic pain", "inflammation", "biomarker",
    "telomere", "epigenetic", "biological age", "accelerated aging",
    "retirement", "labor force", "work disability", "pension",
    "social participation", "isolation", "loneliness",
    "caregiving", "informal care", "formal care", "long-term care use",
    "institutionalization", "nursing home admission",
]

# Global Aging Data datasets
DATASET_INFO = {
    "HRS": {
        "name": "Health and Retirement Study",
        "region": "United States",
        "age_group": "50+",
        "focus": "Health, retirement, economic well-being",
        "keywords": ["united states", "retirement", "health", "income", "wealth", "pension", "medicare", "cognitive", "disability"]
    },
    "CHARLS": {
        "name": "China Health and Retirement Longitudinal Study",
        "region": "China",
        "age_group": "45+",
        "focus": "Health, economic, social circumstances",
        "keywords": ["china", "chinese", "developing", "asia", "rural", "urban", "pension", "healthcare"]
    },
    "ELSA": {
        "name": "English Longitudinal Study of Ageing",
        "region": "England/UK",
        "age_group": "50+",
        "focus": "Health, social, economic, psychological",
        "keywords": ["england", "UK", "united kingdom", "europe", "retirement", "well-being"]
    },
    "SHARE": {
        "name": "Survey of Health, Ageing and Retirement in Europe",
        "region": "Europe",
        "age_group": "50+",
        "focus": "Health, socio-economic, social networks",
        "keywords": ["europe", "european", "EU", "cross-national", "comparative", "social", "pension"]
    },
    "LASI": {
        "name": "Longitudinal Ageing Study in India",
        "region": "India",
        "age_group": "45+",
        "focus": "Health, social, economic well-being",
        "keywords": ["india", "indian", "south asia", "developing", "LMIC", "rural"]
    },
    "MHAS": {
        "name": "Mexican Health and Aging Study",
        "region": "Mexico",
        "age_group": "50+",
        "focus": "Health, economic, social factors",
        "keywords": ["mexico", "mexican", "latin america", "hispanic", "developing"]
    },
    "JSTAR": {
        "name": "Japanese Study of Aging and Retirement",
        "region": "Japan",
        "age_group": "50+",
        "focus": "Work, health, retirement",
        "keywords": ["japan", "japanese", "east asia", "aging society", "super-aged"]
    },
    "KLoSA": {
        "name": "Korean Longitudinal Study of Aging",
        "region": "South Korea",
        "age_group": "45+",
        "focus": "Health, retirement, social",
        "keywords": ["korea", "korean", "east asia"]
    },
    "TILDA": {
        "name": "The Irish Longitudinal Study on Ageing",
        "region": "Ireland",
        "age_group": "50+",
        "focus": "Health, economic, social well-being",
        "keywords": ["ireland", "irish", "europe"]
    },
    "SAB": {
        "name": "Study on Global AGEing and Adult Health",
        "region": "Multiple LMICs",
        "age_group": "50+",
        "focus": "Health, well-being in LMICs",
        "keywords": ["global", "LMIC", "developing", "low income", "middle income", "africa", "asia"]
    },
    "GATE": {
        "name": "Gateway to Global Aging Data",
        "region": "Global (Harmonized)",
        "age_group": "50+",
        "focus": "Harmonized cross-national aging data",
        "keywords": ["harmonized", "cross-national", "comparative", "international", "global"]
    },
    "WHOA": {
        "name": "WHO Study on Global AGEing and Adult Health",
        "region": "Global",
        "age_group": "18+",
        "focus": "Health systems, aging",
        "keywords": ["WHO", "global health", "health system", "policy"]
    },
}

# Research type patterns
RESEARCH_TYPE_PATTERNS = {
    "survival_analysis": ["survival", "mortality", "death", "time to event", "hazard", "kaplan", "cox", "competing risk", "mortality risk"],
    "cross_sectional": ["prevalence", "cross-sectional", "association", "correlate", "determinant", "factor", "burden"],
    "longitudinal": ["longitudinal", "cohort", "panel", "trajectory", "change", "transition", "follow-up", "wave"],
    "intervention": ["randomized", "trial", "RCT", "intervention", "program evaluation", "effectiveness", "efficacy"],
    "inequality": ["inequality", "disparity", "equity", "socioeconomic", "gender", "urban rural", "wealth quintile", "concentration index"],
    "multimorbidity": ["multimorbidity", "comorbidity", "disease cluster", "co-occurring", "pattern"],
    "cognitive": ["cognitive", "dementia", "alzheimer", "memory", "executive function", "decline"],
    "disability": ["disability", "ADL", "IADL", "functional limitation", "activities of daily living", "mobility"],
}


def extract_pico(text: str) -> Dict[str, any]:
    """
    Extract PICO components from research protocol text.
    Returns dict with population, intervention, comparison, outcome, exposure,
    dataset_suggestions, and detected research type.
    """
    text_lower = text.lower()

    population = _extract_element(text_lower, POPULATION_KEYWORDS, text)
    intervention = _extract_element(text_lower, INTERVENTION_KEYWORDS, text)
    exposure = _extract_element(text_lower, EXPOSURE_KEYWORDS, text)
    comparison = _extract_element(text_lower, COMPARISON_KEYWORDS, text)
    outcome = _extract_element(text_lower, OUTCOME_KEYWORDS, text)

    # Detect research type and suggest datasets
    research_type = _detect_research_type(text_lower)
    datasets = _suggest_datasets(text_lower, population, outcome, research_type)

    return {
        "population": population,
        "intervention": intervention,
        "exposure": exposure,
        "comparison": comparison,
        "outcome": outcome,
        "research_type": research_type,
        "dataset_suggestions": datasets,
    }


def _extract_element(text_lower: str, keywords: List[str], original_text: str) -> str:
    """Extract PICO element by finding keyword matches and their surrounding context."""
    matches = []
    for kw in keywords:
        if kw.lower() in text_lower:
            # Find surrounding context (sentence)
            pattern = re.compile(
                r'[^.!?\n]*\b' + re.escape(kw) + r'\b[^.!?\n]*[.!?\n]',
                re.IGNORECASE
            )
            for m in pattern.finditer(original_text):
                sentence = m.group().strip()
                if sentence and sentence not in matches:
                    matches.append(sentence)
            # Also match without word boundaries for multi-word
            if not matches:
                idx = text_lower.find(kw.lower())
                if idx >= 0:
                    start = max(0, idx - 50)
                    end = min(len(original_text), idx + len(kw) + 80)
                    context = original_text[start:end].strip()
                    if context not in matches:
                        matches.append(context)

    if not matches:
        return ""

    # Return the top 3 most relevant matches joined
    # Prioritize longer, more descriptive matches
    matches.sort(key=len, reverse=True)
    unique = []
    for m in matches[:5]:
        if m not in unique:
            unique.append(m)
    return " | ".join(unique[:3])


def _detect_research_type(text_lower: str) -> str:
    """Detect the most likely research type from text."""
    scores = {}
    for rtype, keywords in RESEARCH_TYPE_PATTERNS.items():
        score = sum(1 for kw in keywords if kw.lower() in text_lower)
        if score > 0:
            scores[rtype] = score

    if not scores:
        return "observational"
    return max(scores, key=scores.get)


def _suggest_datasets(text_lower: str, population: str, outcome: str, research_type: str) -> List[Dict[str, str]]:
    """Suggest relevant Global Aging Data datasets based on text analysis."""
    combined_text = text_lower + " " + population.lower() + " " + outcome.lower()
    suggestions = []

    for key, info in DATASET_INFO.items():
        score = 0
        for kw in info["keywords"]:
            if kw.lower() in combined_text:
                score += 1

        # Bonus for research type alignment
        if research_type in ["longitudinal", "survival_analysis"] and "longitudinal" in info["focus"].lower():
            score += 1
        if research_type == "inequality" and ("comparative" in info["focus"].lower() or "cross-national" in str(info["keywords"])):
            score += 2
        if research_type == "cross_sectional" and score > 0:
            score += 1

        if score > 0:
            suggestions.append({
                "dataset": key,
                "name": info["name"],
                "region": info["region"],
                "age_group": info["age_group"],
                "focus": info["focus"],
                "relevance_score": score,
            })

    # Sort by relevance score descending
    suggestions.sort(key=lambda x: x["relevance_score"], reverse=True)

    # Always include at least the top general datasets if few matches
    if len(suggestions) < 2:
        suggestions.append({
            "dataset": "HRS",
            "name": DATASET_INFO["HRS"]["name"],
            "region": DATASET_INFO["HRS"]["region"],
            "age_group": DATASET_INFO["HRS"]["age_group"],
            "focus": DATASET_INFO["HRS"]["focus"],
            "relevance_score": 0,
        })
        suggestions.append({
            "dataset": "GATE",
            "name": DATASET_INFO["GATE"]["name"],
            "region": DATASET_INFO["GATE"]["region"],
            "age_group": DATASET_INFO["GATE"]["age_group"],
            "focus": DATASET_INFO["GATE"]["focus"],
            "relevance_score": 0,
        })

    return suggestions[:5]
