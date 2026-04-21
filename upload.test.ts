import { describe, it, expect } from "vitest";
import type { Request, Response } from "express";
import { authMiddleware } from "./uploadHandler";

describe("File Upload Authentication", () => {
  it("should reject unauthenticated requests", async () => {
    const mockReq = {
      headers: {},
    } as Request;

    const mockRes = {
      status: function(code: number) {
        this.statusCode = code;
        return this;
      },
      json: function(data: any) {
        this.body = data;
        return this;
      },
      statusCode: 0,
      body: null,
    } as any as Response;

    const mockNext = () => {};

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.statusCode).toBe(401);
    expect(mockRes.body).toHaveProperty("error");
  });
});
