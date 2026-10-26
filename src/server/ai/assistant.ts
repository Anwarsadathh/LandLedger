import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { connectToDatabase } from "@/server/db/connect";
import { AiCounter } from "@/server/db/models/ai-counter";
import {
  AREA_UNITS,
  CONTENT_LANGUAGES,
  LISTING_TYPES,
  SUBMITTER_ROLES as SUBMITTER_FIELD_ROLES,
  TRANSACTION_TYPES,
} from "@/server/domain/enums";
import { SUBMITTER_ROLES as SUBMITTER_USER_ROLES, hasRole } from "@/server/auth/roles";
import type { CurrentUser } from "@/server/auth/current-user";
import { CONSENT_NOTICE_VERSION } from "@/lib/consent";
import { LISTING_TYPE_LABELS, formatArea, formatPrice } from "@/lib/format";
import {
  createDraft,
  getPublicListingBySlug,
  searchPublicListings,
} from "@/server/modules/listings/service";
import type { PublicListing } from "@/server/modules/listings/dto";

// OROVA Land Assistant (beta). Claude-powered, grounded ONLY in real published
// listings (via tools) + the curated FAQ below. For signed-in owners it can also
// start a listing: it collects details conversationally and creates a DRAFT
// (never published) that still goes through OROVA's human review.
const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 2048;
const MAX_STEPS = 6;

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

const SYSTEM_BASE = `You are the OROVA Land Assistant — a friendly, concise helper for OROVA, a transparent marketplace for land and property across India. You help visitors (a) find listings and (b) understand how OROVA works.

HARD RULES — never break these:
- Only mention listings returned by the search_listings / get_listing_details tools. NEVER invent a listing, price, area, or location. If a search returns nothing, say so plainly and suggest widening the search (fewer filters, nearby city, different budget).
- You are NOT a lawyer or financial advisor. Never guarantee legal title, approvals, or returns, and never give personalised investment advice. If asked, say OROVA listings are human-reviewed but NOT legally verified, and they should do their own due diligence / consult a professional.
- Owner phone numbers are private. Contact details are shared only after a visitor sends an enquiry on the listing's page. Do not promise or reveal contact numbers.
- Keep answers short and skimmable (2–5 sentences or a tight list). Use Indian number style (₹, lakh, crore). You may reply in the user's language.

HOW TO SEARCH:
- Use search_listings whenever the user asks to find/filter property. Prefer the state name plus free-text q keywords; add city/type/price only when the user is clear. If a filtered search returns nothing, retry once with fewer filters (e.g. drop city, use q).
- State must be a full Indian state name (e.g. "Karnataka", "Bihar"), never a code.

OROVA FACTS (use to answer "how it works" questions):
- OROVA lists land/plots, homes, commercial, agricultural and industrial property across India. Every listing is reviewed by a human before it is published.
- Listings are NOT legally verified — each listing shows what was actually checked. Buyers should verify documents themselves.
- Listing a property is free: use "List property" in the top navigation — it's a step-by-step wizard. Owners can write the title/description in English, Hindi, Kannada or Malayalam.
- The Map page (/map) shows listings on an interactive map; visitors can filter by state, city, type and price and search near their location.
- To reach an owner, open the listing and send an enquiry — the owner's contact is shared after that.

Always be honest about what you don't know. End with a helpful next step when it fits.`;

const SYSTEM_INTAKE = `

LISTING INTAKE (this user is signed in and allowed to list — you can help them create a listing):
- Collect, a couple at a time: property type (land/residential/commercial/agricultural/industrial); sale or lease; a short title (≥4 chars); an optional description; the language they're writing in; price in ₹ (a whole number); area (a number + unit, e.g. sq ft, sq yd, acre, katha, bigha); and location (full state name, district, and the locality/area). Also their contact name and phone, and whether they are the owner, an authorised representative, or a broker.
- You MUST get two explicit confirmations before creating anything, asked clearly, one at a time: (1) that they are the owner of this property or are authorised to list it; (2) that they consent to being contacted about enquiries (OROVA privacy notice). Only set the confirmation flags true if they clearly say yes to each.
- Then call draft_listing. It creates a DRAFT only — it is NOT published. Afterwards tell them: OROVA will review it, and they should open their Dashboard to add photos, set the exact map pin, and submit it for review.
- You cannot upload photos or drop an exact map pin — the location is approximate and the owner refines it in review. NEVER invent details; use only what the owner tells you.`;

const SYSTEM_NO_INTAKE = `

If someone wants to list or create a property: you can't do it for them here, but tell them it's free — they sign in and use "List property" in the top navigation (a short step-by-step wizard). Do not attempt to collect listing details.`;

const READ_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_listings",
    description:
      "Search OROVA's published property/land listings. Use whenever the user wants to find, filter, or browse listings. Returns the top matches with price, area, location and a slug.",
    input_schema: {
      type: "object",
      properties: {
        state: { type: "string", description: 'Full Indian state name, e.g. "Karnataka", "Bihar". Never a code.' },
        city: { type: "string", description: "City or district name; matched fairly strictly." },
        listingType: { type: "string", enum: [...LISTING_TYPES], description: "Property category filter." },
        priceMin: { type: "number", description: "Minimum total price in rupees (e.g. 2500000 for ₹25 lakh)." },
        priceMax: { type: "number", description: "Maximum total price in rupees." },
        q: { type: "string", description: "Free-text keywords matched against the listing title and description." },
        limit: { type: "number", description: "How many results to return, 1–10. Default 6." },
      },
    },
  },
  {
    name: "get_listing_details",
    description:
      "Fetch the full details (including description) of one published listing by its slug. Use after a search when the user wants more about a specific listing.",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string", description: "The listing slug returned by search_listings." } },
      required: ["slug"],
    },
  },
];

const DRAFT_TOOL: Anthropic.Tool = {
  name: "draft_listing",
  description:
    "Create a DRAFT listing for the signed-in owner from details they provided. The draft is NOT published — it goes to OROVA's human review. Only call this after collecting the required details AND getting the two explicit confirmations (authority + contact consent).",
  input_schema: {
    type: "object",
    properties: {
      listingType: { type: "string", enum: [...LISTING_TYPES] },
      transactionType: { type: "string", enum: [...TRANSACTION_TYPES], description: "SALE or LEASE." },
      title: { type: "string", description: "Short listing title, at least 4 characters." },
      description: { type: "string", description: "Optional longer description, in the owner's chosen language." },
      contentLanguage: { type: "string", enum: [...CONTENT_LANGUAGES], description: "Language of the title/description. Default EN." },
      price: {
        type: "object",
        properties: {
          min: { type: "number", description: "Price in rupees, whole number." },
          negotiable: { type: "boolean", description: "Whether the price is negotiable. Default true." },
        },
        required: ["min"],
      },
      area: {
        type: "object",
        properties: {
          value: { type: "number", description: "Area size, a positive number." },
          unit: { type: "string", enum: [...AREA_UNITS], description: "Area unit." },
        },
        required: ["value", "unit"],
      },
      location: {
        type: "object",
        properties: {
          state: { type: "string", description: "Full Indian state name." },
          district: { type: "string", description: "District / city." },
          locality: { type: "string", description: "Locality / area / village (helps place it on the map)." },
        },
        required: ["state", "district"],
      },
      ownerContact: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string", description: "Contact phone number." },
        },
        required: ["phone"],
      },
      submitterRole: { type: "string", enum: [...SUBMITTER_FIELD_ROLES], description: "OWNER, AUTHORISED_REP or BROKER. Default OWNER." },
      authorityConfirmed: { type: "boolean", description: "True ONLY if the user confirmed they own or are authorised to list this property." },
      contactConsentConfirmed: { type: "boolean", description: "True ONLY if the user consented to be contacted (privacy notice)." },
    },
    required: [
      "listingType",
      "transactionType",
      "title",
      "price",
      "area",
      "location",
      "ownerContact",
      "authorityConfirmed",
      "contactConsentConfirmed",
    ],
  },
};

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

const DraftArgs = z.object({
  listingType: z.enum(LISTING_TYPES),
  transactionType: z.enum(TRANSACTION_TYPES),
  title: z.string().trim().min(4).max(160),
  description: z.string().max(5000).optional(),
  contentLanguage: z.enum(CONTENT_LANGUAGES).default("EN"),
  price: z.object({ min: z.number().nonnegative(), negotiable: z.boolean().optional() }),
  area: z.object({ value: z.number().positive(), unit: z.enum(AREA_UNITS) }),
  location: z.object({
    state: z.string().trim().min(2),
    district: z.string().trim().min(1),
    locality: z.string().trim().optional(),
  }),
  ownerContact: z.object({ name: z.string().trim().optional(), phone: z.string().trim().min(6) }),
  submitterRole: z.enum(SUBMITTER_FIELD_ROLES).default("OWNER"),
  authorityConfirmed: z.boolean(),
  contactConsentConfirmed: z.boolean(),
});

function toAssistantListing(l: PublicListing): AssistantListing {
  const slug = l.slug ?? l.id;
  return {
    slug,
    title: l.title,
    typeLabel: LISTING_TYPE_LABELS[l.listingType] ?? l.listingType,
    priceText: formatPrice(l.price),
    areaText: formatArea(l.area),
    locationText: [l.location.locality, l.location.district, l.location.state].filter(Boolean).join(", "),
    image: l.media[0]?.url ?? null,
    url: `/listings/${slug}`,
  };
}

// Best-effort forward geocode via OpenStreetMap Nominatim (free, keyless). Used
// to place an intake draft approximately; the owner sets the exact pin in review.
async function geocode(parts: Array<string | undefined>): Promise<{ lat: number; lng: number } | null> {
  const q = parts.filter(Boolean).join(", ");
  if (!q) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(`${q}, India`)}`,
      { headers: { "User-Agent": "OROVA/1.0 (listing intake)", "Accept-Language": "en" }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = Array.isArray(arr) ? arr[0] : undefined;
    const lat = Number(hit?.lat);
    const lng = Number(hit?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function runReadTool(name: string, rawInput: unknown): Promise<{ payload: unknown; cards: AssistantListing[] }> {
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

async function runDraftListing(rawInput: unknown, user: CurrentUser | null): Promise<{ payload: unknown }> {
  if (!user) return { payload: { error: "not_signed_in", message: "Ask the user to sign in first, then use List property." } };
  if (!hasRole(user.role, SUBMITTER_USER_ROLES)) {
    return { payload: { error: "not_allowed", message: "This account can't create listings. Suggest contacting support." } };
  }
  const parsed = DraftArgs.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { payload: { error: "invalid_arguments", issues: parsed.error.issues.map((i) => i.message) } };
  }
  const a = parsed.data;
  if (!a.authorityConfirmed || !a.contactConsentConfirmed) {
    return {
      payload: {
        error: "confirmations_required",
        message: "Both the authority declaration and contact consent must be confirmed before creating a draft.",
      },
    };
  }

  const point = await geocode([a.location.locality, a.location.district, a.location.state]);
  if (!point) {
    return {
      payload: {
        error: "location_not_found",
        message: "Couldn't place that location on the map. Ask for a more specific locality/town, or tell them to set the pin in the wizard.",
      },
    };
  }

  try {
    const draft = await createDraft(
      {
        listingType: a.listingType,
        transactionType: a.transactionType,
        title: a.title,
        description: a.description,
        contentLanguage: a.contentLanguage,
        price: { min: Math.round(a.price.min), currency: "INR", basis: "TOTAL", negotiable: a.price.negotiable ?? true },
        area: { value: a.area.value, unit: a.area.unit },
        location: {
          state: a.location.state,
          district: a.location.district,
          locality: a.location.locality,
          latitude: point.lat,
          longitude: point.lng,
          pinPrecision: "APPROXIMATE",
        },
        ownerContact: { name: a.ownerContact.name, phone: a.ownerContact.phone },
        submitterRole: a.submitterRole,
        authorityDeclarationAccepted: true,
        contactConsent: { accepted: true, noticeVersion: CONSENT_NOTICE_VERSION },
      },
      user,
    );
    return {
      payload: {
        created: true,
        id: draft.id,
        title: draft.title,
        message:
          "Draft created (not yet published). Tell the owner to open their Dashboard to add photos, set the exact map pin, and submit it for review.",
        reviewPath: "/dashboard",
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the draft.";
    return { payload: { error: "create_failed", message } };
  }
}

async function withinDailyCap(): Promise<boolean> {
  const cap = Number(process.env.AI_DAILY_CAP ?? "0");
  if (!Number.isFinite(cap) || cap <= 0) return true;
  await connectToDatabase();
  const key = `ai:d:${new Date().toISOString().slice(0, 10)}`;
  const doc = await AiCounter.findByIdAndUpdate(key, { $inc: { count: 1 } }, { upsert: true, new: true });
  return doc.count <= cap;
}

function textOf(message: Anthropic.Message): string {
  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("\n").trim();
}

export async function runAssistant(history: ChatTurn[], user: CurrentUser | null = null): Promise<AssistantResult> {
  if (!assistantConfigured()) return { status: "unavailable" };
  if (!(await withinDailyCap())) return { status: "capped" };

  const canList = !!user && hasRole(user.role, SUBMITTER_USER_ROLES);
  const tools = canList ? [...READ_TOOLS, DRAFT_TOOL] : READ_TOOLS;
  const system = SYSTEM_BASE + (canList ? SYSTEM_INTAKE : SYSTEM_NO_INTAKE);

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((t) => ({ role: t.role, content: t.content }));

  const collected = new Map<string, AssistantListing>();
  let reply = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system, tools, messages });

    if (res.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: res.content as unknown as Anthropic.ContentBlockParam[] });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type === "tool_use") {
          let payload: unknown;
          if (block.name === "draft_listing") {
            ({ payload } = await runDraftListing(block.input, user));
          } else {
            const out = await runReadTool(block.name, block.input);
            payload = out.payload;
            for (const c of out.cards) collected.set(c.slug, c);
          }
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(payload) });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    reply = textOf(res);
    break;
  }

  if (!reply) {
    reply = "Sorry — I couldn't put that together just now. Try rephrasing, or browse the map at /map.";
  }

  return { status: "ok", reply, listings: [...collected.values()] };
}
