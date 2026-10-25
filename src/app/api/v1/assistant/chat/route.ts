import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";
import { runAssistant, type ChatTurn } from "@/server/ai/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // the tool-use loop can take a few seconds

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

// POST /api/v1/assistant/chat  ->  { reply, listings }
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const body = BodySchema.parse(await req.json());

    // Keep only the most recent turns and make sure the user speaks last.
    const turns: ChatTurn[] = body.messages.slice(-12);
    if (turns[turns.length - 1]?.role !== "user") {
      return fail("BAD_REQUEST", "The last message must be from the user.", {
        status: 400,
        requestId,
      });
    }

    const result = await runAssistant(turns);

    if (result.status === "unavailable") {
      return fail(
        "ASSISTANT_UNAVAILABLE",
        "The assistant isn't switched on yet. You can still browse listings and the map.",
        { status: 503, requestId },
      );
    }
    if (result.status === "capped") {
      return fail(
        "ASSISTANT_BUSY",
        "The assistant is resting for today to keep things sustainable. Please try again tomorrow, or browse the map.",
        { status: 429, requestId },
      );
    }

    return ok({ reply: result.reply, listings: result.listings }, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
