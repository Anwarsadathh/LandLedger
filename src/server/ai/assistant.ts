import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { connectToDatabase } from "@/server/db/connect";
import { AiCounter } from "@/server/db/models/ai-counter";
import { LISTING_TYPES } from "@/server/domain/enums";
import { LISTING_TYPE_LABELS, formatArea, formatPrice } from "@/lib/format";
import {
  getPublicListingBySlug,
  searchPublicListings,
} from "@/server/modules/listings/service";
import type { PublicListing } from "@/server/modules/listings/dto";

// OROVA Land Assistant (beta). A Claude-powered helper that is grounded ONLY in
// real published listings (via tool use) and the curated FAQ below. It never
// invents listings, never gives legal or investment guarantees, and always
// points users to the human-reviewed listing for the real detail.
//
// Model: the user explicitly chose Sonnet 5.5. We omit the `thinking` param so
// the model runs adaptive thinking (the valid default on Sonnet 5.5 — passing
// `thinking:{type:"disabled"}` would 400), and we round-trip the full content
// blocks each turn so any thinking blocks stay valid across the tool loop.
const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 2048;
const MAX_STEPS = 5; // model turns per request (tool calls + final answer)

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AssistantListing = {
  slug: string;
  title: string;
  typeLabel: string;
  priceText: string;
  areaText: string;
  locationText: string;
  image: string | null;
  url: string;
};

export type AssistantResult =
  | { status: "ok"; reply: string; listings: AssistantListing[] }
  | { status: "unavailable" }
  | { status: "capped" };

export function assistantConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SYSTEM_PROMPT = `You are the OROVA Land Assistant — a friendly, concise helper for OROVA, a transparent marketplace for land and property across India. You help visitors (a) find listings and (b) understand how OROVA works.

HARD RULES — never break these:
- Only mention listings returned by the search_listings / get_listing_details tools. NEVER invent a listing, price, area, or location. If a search returns nothing, say so plainly and suggest widening the search (fewer filters, nearby city, different budget).
- You are NOT a lawyer or financial advisor. Never guarantee legal title, approvals, or returns, and never give personalised investment advice. If asked, say OROVA listings are human-reviewed but NOT legally verified, and they should do their own due diligence / consult a professional.
- Owner phone numbers are private. Contact details are shared only after a visitor sends an enquiry on the listing's page. Do not promise or reveal contact numbers.
- Keep answers short and skimmable (2–5 sentences or a tight list). Use Indian number style (₹, lakh, crore). You may reply in the user's language.
- You cannot create, edit, publish, book, or pay for anything. You can only search and explain. For those actions, guide the user to the right page.

HOW TO SEARCH:
- Use search_listings whenever the user asks to find/filter property. Prefer the state name plus free-text q keywords; add city/type/price only when the user is clear. If a filtered search returns nothing, retry once with fewer filters (e.g. drop city, use q).
- State must be a full Indian state name (e.g. "Karnataka", "Bihar"), never a code.

OROVA FACTS (use to answer "how it works" questions):
- OROVA lists land/plots, homes, commercial, agricultural and industrial property across India. Every listing is reviewed by a human before it is published.
- Listings are NOT legally verified — each listing shows what was actually checked. Buyers should verify documents themselves.
- Listing a property is free: use "List property" in the top navigation — it's a step-by-step wizard. Owners can write the title/description in English, Hindi, Kannada or Malayalam.
- The Map page (/map) shows listings on an interactive map; visitors can filter by state, city, type and price and search near their location.
- To reach an owner, open the listing and send an enquiry — the owner's contact is shared after that.

Always be honest about what you don't know. End with a helpful next step when it fits (e.g. "Open the listing to send an enquiry.").`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_listings",
    description:
      "Search OROVA's published property/land listings. Use this whenever the user wants to find, filter, or browse listings. Returns the top matches with price, area, location and a slug.",
    input_schema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: 'Full Indian state name, e.g. "Karnataka", "Bihar". Never a code.',
        },
        city: {
          type: "string",
          description: "City or district name. Use only when the user names a place; it is matched fairly strictly.",
        },
        listingType: {
          type: "string",
          enum: [...LISTING_TYPES],
          description: "Property category filter.",
        },
        priceMin: { type: "number", description: "Minimum total price in rupees (e.g. 2500000 for ₹25 lakh)." },
        priceMax: { type: "number", description: "Maximum total price in rupees." },
        q: {
          type: "string",
          description: "Free-text keywords matched against the listing title and description (e.g. 'corner plot', 'near highway').",
        },
        limit: { type: "number", description: "How many results to return, 1–10. Default 6." },
      },
    },
  },
  {
    name: "get_listing_details",
    description:
      "Fetch the full details (including description) of one published listing by its slug. Use after a search when the user wants to know more about a specific listing.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The listing slug returned by search_listings." },
      },
      required: ["slug"],
    },
  },
];

const SearchArgs = z.object({
  state: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  listingType: z.enum(LISTING_TYPES).optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  q: z.string().trim().min(1).optional(),
  limit: z.number().int().optional(),
});

const SlugArgs = z.object({ slug: z.string().trim().min(1) });

function toAssistantListing(l: PublicListing): AssistantListing {
  const slug = l.slug ?? l.id;
  return {
    slug,
    title: l.title,
    typeLabel: LISTING_TYPE_LABELS[l.listingType] ?? l.listingType,
    priceText: formatPrice(l.price),
    areaText: formatArea(l.area),
    locationText: [l.location.locality, l.location.district, l.location.state]
      .filter(Boolean)
      .join(", "),
    image: l.media[0]?.url ?? null,
    url: `/listings/${slug}`,
  };
}

// Runs one tool call; returns a compact JSON payload for the model plus any
// listing cards to surface in the UI.
async function runTool(
  name: string,
  rawInput: unknown,
): Promise<{ payload: unknown; cards: AssistantListing[] }> {
  if (name === "search_listings") {
    const parsed = SearchArgs.safeParse(rawInput ?? {});
    if (!parsed.success) return { payload: { error: "invalid_arguments" }, cards: [] };
    const a = parsed.data;
    const res = await searchPublicListings({
      state: a.state,
      city: a.city,
      listingType: a.listingType,
      priceMin: a.priceMin,
      priceMax: a.priceMax,
      q: a.q,
      limit: Math.min(Math.max(a.limit ?? 6, 1), 10),
    });
    const cards = res.items.map(toAssistantListing);
    return {
      payload: {
        count: cards.length,
        listings: cards.map((c) => ({
          slug: c.slug,
          title: c.title,
          type: c.typeLabel,
          price: c.priceText,
          area: c.areaText,
          location: c.locationText,
        })),
      },
      cards,
    };
  }

  if (name === "get_listing_details") {
    const parsed = SlugArgs.safeParse(rawInput ?? {});
    if (!parsed.success) return { payload: { error: "invalid_arguments" }, cards: [] };
    try {
      const listing = await getPublicListingBySlug(parsed.data.slug);
      const card = toAssistantListing(listing);
      return {
        payload: {
          slug: card.slug,
          title: card.title,
          type: card.typeLabel,
          price: card.priceText,
          area: card.areaText,
          location: card.locationText,
          description: listing.description ?? null,
          negotiable: listing.price.negotiable,
        },
        cards: [card],
      };
    } catch {
      return { payload: { error: "not_found" }, cards: [] };
    }
  }

  return { payload: { error: "unknown_tool" }, cards: [] };
}

// Atomic per-day cap. AI_DAILY_CAP unset or 0 => unlimited. Returns false when
// the day's budget is already spent (the call should be refused).
async function withinDailyCap(): Promise<boolean> {
  const cap = Number(process.env.AI_DAILY_CAP ?? "0");
  if (!Number.isFinite(cap) || cap <= 0) return true;
  await connectToDatabase();
  const key = `ai:d:${new Date().toISOString().slice(0, 10)}`;
  const doc = await AiCounter.findByIdAndUpdate(
    key,
    { $inc: { count: 1 } },
    { upsert: true, new: true },
  );
  return doc.count <= cap;
}

function textOf(message: Anthropic.Message): string {
  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("\n").trim();
}

export async function runAssistant(history: ChatTurn[]): Promise<AssistantResult> {
  if (!assistantConfigured()) return { status: "unavailable" };
  if (!(await withinDailyCap())) return { status: "capped" };

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((t) => ({
    role: t.role,
    content: t.content,
  }));

  const collected = new Map<string, AssistantListing>();
  let reply = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    if (res.stop_reason === "tool_use") {
      // Preserve the full assistant turn (incl. any thinking blocks) verbatim.
      messages.push({ role: "assistant", content: res.content as unknown as Anthropic.ContentBlockParam[] });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type === "tool_use") {
          const { payload, cards } = await runTool(block.name, block.input);
          for (const c of cards) collected.set(c.slug, c);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(payload),
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    reply = textOf(res);
    break;
  }

  if (!reply) {
    reply =
      "Sorry — I couldn't put that together just now. Try rephrasing, or browse the map at /map.";
  }

  return { status: "ok", reply, listings: [...collected.values()] };
}
