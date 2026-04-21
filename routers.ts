import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createProject,
  getUserProjects,
  getProjectById,
  createUploadedFile,
  getProjectFiles,
  createPicoAnalysis,
  getProjectPicoAnalysis,
  getProjectStatisticalAnalyses,
  getProjectTables,
  getProjectFigures,
  getProjectManuscript,
  getProjectCitations,
} from "./db";
import { extractTextFromFile, uploadFileToStorage } from "./fileService";
import { analyzePICO, recommendDatasets } from "./picoService";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  project: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const project = await createProject({
          userId: ctx.user.id,
          title: input.title,
          description: input.description || null,
        });
        return project;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserProjects(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or access denied");
        }
        return project;
      }),

    getDetails: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or access denied");
        }

        const [files, picoAnalysis, analyses, tables, figures, manuscript, citations] = await Promise.all([
          getProjectFiles(input.projectId),
          getProjectPicoAnalysis(input.projectId),
          getProjectStatisticalAnalyses(input.projectId),
          getProjectTables(input.projectId),
          getProjectFigures(input.projectId),
          getProjectManuscript(input.projectId),
          getProjectCitations(input.projectId),
        ]);

        return {
          project,
          files,
          picoAnalysis,
          analyses,
          tables,
          figures,
          manuscript,
          citations,
        };
      }),
  }),

  file: router({
    upload: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          fileName: z.string(),
          fileData: z.string(), // base64 encoded
          fileType: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or access denied");
        }

        const fileBuffer = Buffer.from(input.fileData, "base64");
        const fileSize = fileBuffer.length;

        const { fileKey, fileUrl } = await uploadFileToStorage(
          fileBuffer,
          input.fileName,
          input.fileType,
          ctx.user.id
        );

        const uploadedFile = await createUploadedFile({
          projectId: input.projectId,
          fileName: input.fileName,
          fileKey,
          fileUrl,
          fileType: input.fileType,
          fileSize,
        });

        return uploadedFile;
      }),

    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or access denied");
        }

        return getProjectFiles(input.projectId);
      }),
  }),

  pico: router({
    analyze: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          fileId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or access denied");
        }

        const files = await getProjectFiles(input.projectId);
        const file = files.find((f) => f.id === input.fileId);
        if (!file) {
          throw new Error("File not found");
        }

        // Download file from storage
        const response = await fetch(file.fileUrl);
        const fileBuffer = Buffer.from(await response.arrayBuffer());

        // Extract text
        const text = await extractTextFromFile(fileBuffer, file.fileType);

        // Analyze PICO
        const analysis = await analyzePICO(text);

        // Save analysis
        const picoAnalysis = await createPicoAnalysis({
          projectId: input.projectId,
          fileId: input.fileId,
          population: analysis.population,
          intervention: analysis.intervention || null,
          comparison: analysis.comparison || null,
          outcome: analysis.outcome,
          exposure: analysis.exposure || null,
          variables: analysis.variables,
          datasetCompatibility: analysis.datasetCompatibility,
        });

        // Get dataset recommendations
        const recommendations = recommendDatasets(analysis);

        return {
          analysis: picoAnalysis,
          recommendations,
        };
      }),

    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or access denied");
        }

        const analysis = await getProjectPicoAnalysis(input.projectId);
        if (!analysis) {
          return null;
        }

        const recommendations = recommendDatasets({
          population: analysis.population || "",
          intervention: analysis.intervention || undefined,
          comparison: analysis.comparison || undefined,
          outcome: analysis.outcome || "",
          exposure: analysis.exposure || undefined,
          variables: (analysis.variables as string[]) || [],
          datasetCompatibility: analysis.datasetCompatibility as any,
        });

        return {
          analysis,
          recommendations,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
