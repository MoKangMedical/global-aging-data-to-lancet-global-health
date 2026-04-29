import axios from "axios";
import { invokeLLM } from "./_core/llm";

const PUBMED_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  abstract: string;
  doi?: string;
}

/**
 * Search PubMed for articles related to a query
 */
export async function searchPubMed(
  query: string,
  maxResults: number = 20
): Promise<string[]> {
  try {
    const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi`;
    const response = await axios.get(searchUrl, {
      params: {
        db: "pubmed",
        term: query,
        retmax: maxResults,
        retmode: "json",
        sort: "relevance",
      },
    });

    const idList = response.data?.esearchresult?.idlist || [];
    return idList;
  } catch (error) {
    console.error("PubMed search error:", error);
    return [];
  }
}

/**
 * Fetch article details from PubMed
 */
export async function fetchPubMedArticles(
  pmids: string[]
): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];

  try {
    const fetchUrl = `${PUBMED_BASE_URL}/efetch.fcgi`;
    const response = await axios.get(fetchUrl, {
      params: {
        db: "pubmed",
        id: pmids.join(","),
        retmode: "xml",
      },
    });

    // Parse XML response (simplified - in production use proper XML parser)
    const articles: PubMedArticle[] = [];
    const xmlText = response.data;

    // Extract article information using regex (simplified approach)
    const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let articleMatch;

    while ((articleMatch = articleRegex.exec(xmlText)) !== null) {
      const articleXml = articleMatch[1];

      const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const titleMatch = articleXml.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
      const journalMatch = articleXml.match(/<Title>([\s\S]*?)<\/Title>/);
      const yearMatch = articleXml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
      const abstractMatch = articleXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
      const doiMatch = articleXml.match(/<ArticleId IdType="doi">(.*?)<\/ArticleId>/);

      // Extract authors
      const authorRegex = /<Author[^>]*>[\s\S]*?<LastName>([\s\S]*?)<\/LastName>[\s\S]*?<ForeName>([\s\S]*?)<\/ForeName>[\s\S]*?<\/Author>/g;
      const authors: string[] = [];
      let authorMatch;
      while ((authorMatch = authorRegex.exec(articleXml)) !== null && authors.length < 6) {
        authors.push(`${authorMatch[2]} ${authorMatch[1]}`);
      }
      const authorString = authors.length > 0 ? authors.join(", ") + (authors.length === 6 ? ", et al." : "") : "Unknown";

      if (pmidMatch && titleMatch) {
        articles.push({
          pmid: pmidMatch[1],
          title: titleMatch[1].replace(/<[^>]+>/g, ""),
          authors: authorString,
          journal: journalMatch ? journalMatch[1] : "Unknown",
          year: yearMatch ? parseInt(yearMatch[1]) : 0,
          abstract: abstractMatch ? abstractMatch[1].replace(/<[^>]+>/g, "") : "",
          doi: doiMatch ? doiMatch[1] : undefined,
        });
      }
    }

    return articles;
  } catch (error) {
    console.error("PubMed fetch error:", error);
    return [];
  }
}

/**
 * Generate citation text in Lancet format
 */
export function formatLancetCitation(
  article: PubMedArticle,
  citationNumber: number
): string {
  // Lancet citation format: Number. Authors. Title. Journal Year; Volume: Pages.
  return `${citationNumber}. ${article.authors}. ${article.title}. ${article.journal} ${article.year}.`;
}

/**
 * Generate manuscript using LLM
 */
export async function generateManuscript(params: {
  title: string;
  picoAnalysis: any;
  statisticalResults: any;
  citations: PubMedArticle[];
}): Promise<{
  abstract: string;
  introduction: string;
  methods: string;
  results: string;
  discussion: string;
}> {
  const prompt = `You are an expert epidemiologist and academic writer. Generate a research manuscript in Lancet journal style based on the following information:

Title: ${params.title}

PICO/PECO Framework:
- Population: ${params.picoAnalysis.population}
- Intervention: ${params.picoAnalysis.intervention || "N/A"}
- Comparison: ${params.picoAnalysis.comparison || "N/A"}
- Outcome: ${params.picoAnalysis.outcome}
- Exposure: ${params.picoAnalysis.exposure || "N/A"}

Statistical Analysis Results:
${JSON.stringify(params.statisticalResults, null, 2)}

Available References:
${params.citations.map((c, i) => `[${i + 1}] ${c.title} - ${c.authors} (${c.year})`).join("\n")}

Please generate a complete manuscript with the following sections:

1. **Abstract** (250-300 words): Background, Methods, Findings, Interpretation
2. **Introduction** (2-3 paragraphs): Background, knowledge gap, study objectives
3. **Methods** (3-4 paragraphs): Study design, population, variables, statistical analysis
4. **Results** (3-4 paragraphs): Baseline characteristics, main findings, subgroup analyses
5. **Discussion** (4-5 paragraphs): Main findings, comparison with literature, strengths and limitations, implications

Write in a formal academic style appropriate for The Lancet. Use appropriate citations [1], [2], etc. where relevant.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert epidemiologist and academic medical writer specializing in manuscripts for top-tier journals like The Lancet.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "manuscript",
        strict: true,
        schema: {
          type: "object",
          properties: {
            abstract: { type: "string" },
            introduction: { type: "string" },
            methods: { type: "string" },
            results: { type: "string" },
            discussion: { type: "string" },
          },
          required: ["abstract", "introduction", "methods", "results", "discussion"],
          additionalProperties: false,
        },
      },
    },
  });

  const message = response.choices[0]?.message;
  if (!message?.content) {
    throw new Error("No response from LLM");
  }

  const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
  return JSON.parse(content);
}

/**
 * Search and retrieve relevant literature for a research topic
 */
export async function findRelevantLiterature(
  researchTopic: string,
  keywords: string[]
): Promise<PubMedArticle[]> {
  // Construct search query
  const query = `${researchTopic} AND (${keywords.join(" OR ")})`;

  // Search PubMed
  const pmids = await searchPubMed(query, 15);

  // Fetch article details
  const articles = await fetchPubMedArticles(pmids);

  return articles;
}
