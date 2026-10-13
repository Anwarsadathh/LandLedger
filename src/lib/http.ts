import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

/**
 * Standard API envelope + error shape (see handover spec §8 and Appendix A).
 * Every response carries a requestId for tracing.
 */

export function newRequestId(): string {
  return `req_${randomUUID()}`;
}

type ErrorDetail = { field: string; issue: string };

export function ok<T>(data: T, init?: { status?: number; requestId?: string }) {
  const requestId = init?.requestId ?? newRequestId();
  return NextResponse.json({ data, requestId }, { status: init?.status ?? 200 });
}

export function fail(
  code: string,
  message: string,
  init?: { status?: number; requestId?: string; details?: ErrorDetail[] },
) {
  const requestId = init?.requestId ?? newRequestId();
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId,
        ...(init?.details ? { details: init.details } : {}),
      },
    },
    { status: init?.status ?? 400 },
  );
}

/** Known domain error with an HTTP status + stable machine code. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Translate thrown errors into the standard error response. */
export function toErrorResponse(err: unknown, requestId = newRequestId()) {
  if (err instanceof ZodError) {
    return fail("VALIDATION_ERROR", "Please correct the highlighted fields.", {
      status: 422,
      requestId,
      details: err.issues.map((i) => ({
        field: i.path.join(".") || "(root)",
        issue: i.message,
      })),
    });
  }
  if (err instanceof ApiError) {
    return fail(err.code, err.message, { status: err.status, requestId });
  }
  console.error(`[${requestId}] Unhandled API error:`, err);
  return fail("INTERNAL_ERROR", "Something went wrong. Please try again.", {
    status: 500,
    requestId,
  });
}
