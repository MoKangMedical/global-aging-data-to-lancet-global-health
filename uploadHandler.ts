import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { extractTextFromFile } from "./fileService";
import { analyzePICO } from "./picoService";
import { getDb } from "./db";
import { uploadedFiles, picoAnalyses } from "../drizzle/schema";
import { sdk } from "./_core/sdk";

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and Word documents are allowed."));
    }
  },
});

export const uploadMiddleware = upload.single("file");

// Authentication middleware for file upload
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized - Please log in" });
    }
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized - Authentication failed" });
  }
}

export async function handleFileUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const projectId = parseInt(req.body.projectId);
    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Get user from session (assuming auth middleware sets req.user)
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const file = req.file;
    const fileName = file.originalname;
    const fileBuffer = file.buffer;

    // Extract text from file
    let extractedText: string;
    try {
      extractedText = await extractTextFromFile(fileBuffer, file.mimetype);
    } catch (error) {
      console.error("Text extraction error:", error);
      return res.status(500).json({ error: "Failed to extract text from file" });
    }

    // Analyze protocol with PICO
    let analysisResult;
    try {
      analysisResult = await analyzePICO(extractedText);
    } catch (error) {
      console.error("Protocol analysis error:", error);
      return res.status(500).json({ error: "Failed to analyze protocol" });
    }

    // Save file record to database
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const fileKey = `project-${projectId}/uploads/${nanoid()}_${fileName}`;

    const fileRecord = await db.insert(uploadedFiles).values({
      projectId,
      fileName,
      fileKey,
      fileUrl: "", // Will be updated after S3 upload if needed
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date(),
    });

    const fileId = fileRecord[0].insertId;

    // Save PICO analysis
    if (analysisResult) {
      const variablesArray = analysisResult.variables || [];
      
      await db.insert(picoAnalyses).values({
        projectId,
        fileId,
        population: analysisResult.population || null,
        intervention: analysisResult.intervention || null,
        comparison: analysisResult.comparison || null,
        outcome: analysisResult.outcome || null,
        exposure: analysisResult.exposure || null,
        variables: variablesArray,
        datasetCompatibility: analysisResult.datasetCompatibility || {
          compatible: true,
          matchedVariables: [],
          missingVariables: [],
          suggestions: "",
        },
        analyzedAt: new Date(),
      });
    }

    res.json({
      success: true,
      fileId,
      fileName,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error("Upload handler error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
}
