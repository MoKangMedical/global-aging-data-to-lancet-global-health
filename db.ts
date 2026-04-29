import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  projects,
  InsertProject,
  Project,
  uploadedFiles,
  InsertUploadedFile,
  UploadedFile,
  picoAnalyses,
  InsertPicoAnalysis,
  PicoAnalysis,
  statisticalAnalyses,
  InsertStatisticalAnalysis,
  StatisticalAnalysis,
  generatedTables,
  InsertGeneratedTable,
  GeneratedTable,
  generatedFigures,
  InsertGeneratedFigure,
  GeneratedFigure,
  manuscripts,
  InsertManuscript,
  Manuscript,
  citations,
  InsertCitation,
  Citation
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Project queries
export async function createProject(project: InsertProject): Promise<Project> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values(project);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(projects).where(eq(projects.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted project");

  return inserted[0];
}

export async function getUserProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
}

export async function getProjectById(projectId: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result[0];
}

// File queries
export async function createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(uploadedFiles).values(file);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted file");

  return inserted[0];
}

export async function getProjectFiles(projectId: number): Promise<UploadedFile[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(uploadedFiles).where(eq(uploadedFiles.projectId, projectId)).orderBy(desc(uploadedFiles.uploadedAt));
}

// PICO analysis queries
export async function createPicoAnalysis(analysis: InsertPicoAnalysis): Promise<PicoAnalysis> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(picoAnalyses).values(analysis);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(picoAnalyses).where(eq(picoAnalyses.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted analysis");

  return inserted[0];
}

export async function getProjectPicoAnalysis(projectId: number): Promise<PicoAnalysis | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(picoAnalyses).where(eq(picoAnalyses.projectId, projectId)).orderBy(desc(picoAnalyses.analyzedAt)).limit(1);
  return result[0];
}

// Statistical analysis queries
export async function createStatisticalAnalysis(analysis: InsertStatisticalAnalysis): Promise<StatisticalAnalysis> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(statisticalAnalyses).values(analysis);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(statisticalAnalyses).where(eq(statisticalAnalyses.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted analysis");

  return inserted[0];
}

export async function getProjectStatisticalAnalyses(projectId: number): Promise<StatisticalAnalysis[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(statisticalAnalyses).where(eq(statisticalAnalyses.projectId, projectId)).orderBy(desc(statisticalAnalyses.createdAt));
}

export async function updateStatisticalAnalysis(
  id: number,
  updates: Partial<Pick<StatisticalAnalysis, "results" | "status" | "errorMessage" | "completedAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(statisticalAnalyses).set(updates).where(eq(statisticalAnalyses.id, id));
}

// Generated table queries
export async function createGeneratedTable(table: InsertGeneratedTable): Promise<GeneratedTable> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(generatedTables).values(table);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(generatedTables).where(eq(generatedTables.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted table");

  return inserted[0];
}

export async function getProjectTables(projectId: number): Promise<GeneratedTable[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(generatedTables).where(eq(generatedTables.projectId, projectId)).orderBy(desc(generatedTables.createdAt));
}

// Generated figure queries
export async function createGeneratedFigure(figure: InsertGeneratedFigure): Promise<GeneratedFigure> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(generatedFigures).values(figure);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(generatedFigures).where(eq(generatedFigures.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted figure");

  return inserted[0];
}

export async function getProjectFigures(projectId: number): Promise<GeneratedFigure[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(generatedFigures).where(eq(generatedFigures.projectId, projectId)).orderBy(desc(generatedFigures.createdAt));
}

// Manuscript queries
export async function createManuscript(manuscript: InsertManuscript): Promise<Manuscript> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(manuscripts).values(manuscript);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(manuscripts).where(eq(manuscripts.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted manuscript");

  return inserted[0];
}

export async function getProjectManuscript(projectId: number): Promise<Manuscript | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(manuscripts).where(eq(manuscripts.projectId, projectId)).orderBy(desc(manuscripts.createdAt)).limit(1);
  return result[0];
}

export async function updateManuscript(
  id: number,
  updates: Partial<Omit<Manuscript, "id" | "projectId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(manuscripts).set(updates).where(eq(manuscripts.id, id));
}

// Citation queries
export async function createCitation(citation: InsertCitation): Promise<Citation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(citations).values(citation);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(citations).where(eq(citations.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted citation");

  return inserted[0];
}

export async function getProjectCitations(projectId: number): Promise<Citation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(citations).where(eq(citations.projectId, projectId)).orderBy(desc(citations.addedAt));
}
