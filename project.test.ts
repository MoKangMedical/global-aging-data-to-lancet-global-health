import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("project router", () => {
  it("should create a new project", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.project.create({
      title: "Test Research Project",
      description: "A test project for epidemiological research",
    });

    expect(project).toBeDefined();
    expect(project.title).toBe("Test Research Project");
    expect(project.userId).toBe(1);
    expect(project.status).toBe("draft");
  });

  it("should list user projects", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project first
    await caller.project.create({
      title: "Project 1",
    });

    const projects = await caller.project.list();

    expect(projects).toBeDefined();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
  });

  it("should get project details", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project
    const project = await caller.project.create({
      title: "Detailed Project",
      description: "Project with full details",
    });

    const details = await caller.project.getDetails({ projectId: project.id });

    expect(details).toBeDefined();
    expect(details.project.id).toBe(project.id);
    expect(details.files).toBeDefined();
    expect(details.analyses).toBeDefined();
    expect(details.tables).toBeDefined();
    expect(details.figures).toBeDefined();
  });
});
