import { invokeLLM } from "./_core/llm";

export interface PICOAnalysisResult {
  population: string;
  intervention?: string;
  comparison?: string;
  outcome: string;
  exposure?: string;
  variables: string[];
  datasetCompatibility: {
    compatible: boolean;
    matchedVariables: string[];
    missingVariables: string[];
    suggestions: string;
  };
}

/**
 * Analyze research protocol and extract PICO/PECO elements
 */
export async function analyzePICO(
  protocolText: string
): Promise<PICOAnalysisResult> {
  const prompt = `You are an epidemiology expert. Analyze the following research protocol and extract PICO/PECO elements.

Research Protocol:
${protocolText}

Please extract the following information:
1. Population (P): The target population or study participants
2. Intervention (I): The intervention being studied (if applicable)
3. Comparison (C): The comparison group or control (if applicable)
4. Outcome (O): The primary outcome or endpoint
5. Exposure (E): The exposure of interest (for observational studies)
6. Variables: List all key variables mentioned in the protocol (demographics, clinical measures, outcomes, etc.)

Also assess compatibility with Global Aging Data (g2aging.org) which includes:
- Demographic variables: age, sex, education, marital status
- Health outcomes: mortality, chronic diseases (diabetes, hypertension, heart disease, stroke, cancer)
- Functional status: ADL, IADL, mobility limitations
- Cognitive function: memory, cognitive impairment
- Healthcare utilization: hospitalizations, doctor visits
- Socioeconomic factors: income, employment, retirement status

Provide your analysis in the following JSON format:
{
  "population": "description of target population",
  "intervention": "intervention if applicable, otherwise null",
  "comparison": "comparison group if applicable, otherwise null",
  "outcome": "primary outcome",
  "exposure": "exposure if observational study, otherwise null",
  "variables": ["variable1", "variable2", ...],
  "datasetCompatibility": {
    "compatible": true/false,
    "matchedVariables": ["list of variables available in Global Aging Data"],
    "missingVariables": ["list of variables NOT available in Global Aging Data"],
    "suggestions": "suggestions for data analysis approach"
  }
}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an epidemiology expert specializing in research protocol analysis and PICO/PECO framework extraction.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "pico_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            population: { type: "string" },
            intervention: { anyOf: [{ type: "string" }, { type: "null" }] },
            comparison: { anyOf: [{ type: "string" }, { type: "null" }] },
            outcome: { type: "string" },
            exposure: { anyOf: [{ type: "string" }, { type: "null" }] },
            variables: {
              type: "array",
              items: { type: "string" },
            },
            datasetCompatibility: {
              type: "object",
              properties: {
                compatible: { type: "boolean" },
                matchedVariables: {
                  type: "array",
                  items: { type: "string" },
                },
                missingVariables: {
                  type: "array",
                  items: { type: "string" },
                },
                suggestions: { type: "string" },
              },
              required: [
                "compatible",
                "matchedVariables",
                "missingVariables",
                "suggestions",
              ],
              additionalProperties: false,
            },
          },
          required: [
            "population",
            "outcome",
            "variables",
            "datasetCompatibility",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  // Add detailed logging for debugging
  console.log("LLM response:", JSON.stringify(response, null, 2));
  
  if (!response || !response.choices || response.choices.length === 0) {
    console.error("Invalid LLM response structure:", response);
    throw new Error("Invalid response from LLM: no choices available");
  }
  
  const message = response.choices[0]?.message;
  if (!message?.content) {
    console.error("No content in LLM message:", message);
    throw new Error("No content in LLM response");
  }

  const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
  return JSON.parse(content) as PICOAnalysisResult;
}

/**
 * Recommend Global Aging Data datasets based on PICO analysis
 */
export function recommendDatasets(analysis: PICOAnalysisResult): {
  datasets: Array<{
    name: string;
    description: string;
    relevance: string;
    downloadUrl: string;
  }>;
} {
  const datasets = [
    {
      name: "Harmonized HRS",
      description: "Health and Retirement Study (USA) - Longitudinal study of Americans over age 50",
      relevance: "Comprehensive health, economic, and social data",
      downloadUrl: "https://g2aging.org/harmonized-data/get-data",
    },
    {
      name: "Harmonized CHARLS",
      description: "China Health and Retirement Longitudinal Study",
      relevance: "Asian population data with similar variables to HRS",
      downloadUrl: "https://g2aging.org/harmonized-data/get-data",
    },
    {
      name: "Harmonized ELSA",
      description: "English Longitudinal Study of Ageing",
      relevance: "European population with detailed health measures",
      downloadUrl: "https://g2aging.org/harmonized-data/get-data",
    },
    {
      name: "Harmonized SHARE",
      description: "Survey of Health, Ageing and Retirement in Europe",
      relevance: "Multi-country European data",
      downloadUrl: "https://g2aging.org/harmonized-data/get-data",
    },
  ];

  // Filter datasets based on matched variables
  const relevantDatasets = datasets.filter((dataset) => {
    // All harmonized datasets contain similar core variables
    return analysis.datasetCompatibility.compatible;
  });

  return {
    datasets: relevantDatasets.length > 0 ? relevantDatasets : datasets,
  };
}
