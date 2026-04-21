  population: text("population"),
  intervention: text("intervention"),
  comparison: text("comparison"),
  outcome: text("outcome"),
  exposure: text("exposure"),
  variables: json("variables").$type<string[]>(),
  datasetCompatibility: json("datasetCompatibility").$type<{
    compatible: boolean;
    matchedVariables: string[];
    missingVariables: string[];
    suggestions: string;
  }>(),
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
});

export type PicoAnalysis = typeof picoAnalyses.$inferSelect;
export type InsertPicoAnalysis = typeof picoAnalyses.$inferInsert;

/**
 * Statistical analysis results