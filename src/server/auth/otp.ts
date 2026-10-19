import { hashPassword, verifyPassword } from "@/server/auth/password";
import { connectToDatabase } from "@/server/db/connect";
import { OtpChallenge } from "@/server/db/models/otp";
import { OtpCounter } from "@/server/db/models/otp-counter";
import { sendViaSmsLocal, smsLocalConfigured } from "@/server/auth/smslocal";

// OTP delivery with pluggable providers:
//   1. SmsLocal (India SMS, no DLT) — preferred when SMSLOCAL_API_KEY is set.
//   2. Twilio Programmable Messaging (SMS or WhatsApp) — when configured.
//   3. DEV fallback — logs the code to the server console (free, local testing).
// We generate and store the code ourselves (hashed, with expiry + attempt cap).

const CODE_TTL_MS = 5 * 60_000; // 5 minutes
const MAX_ATTEMPTS = 5;

function twilioEnv() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const smsFrom = process.env.TWILIO_SMS_FROM; // e.g. "+17372508034" — plain SMS, no template
  const waFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+17372508034"
  const contentSid = process.env.TWILIO_CONTENT_SID || "";
  if (sid && token && (smsFrom || waFrom)) return { sid, token, smsFrom, waFrom, contentSid };
  return null;
}

export type OtpResult = { ok: boolean; dev?: boolean; error?: string };

// ---------- Layer A: app-level send cap ----------
// Set OTP_DAILY_CAP / OTP_MONTHLY_CAP a bit BELOW your provider's free quota so
// you can never exceed it. 0 / unset = no cap. Only counts real-provider sends.
const DAILY_CAP = Number(process.env.OTP_DAILY_CAP || 0);
const MONTHLY_CAP = Number(process.env.OTP_MONTHLY_CAP || 0);

const dayKey = () => `d:${new Date().toISOString().slice(0, 10)}`; // d:2026-10-19
const monthKey = () => `m:${new Date().toISOString().slice(0, 7)}`; // m:2026-10

async function capReached(): Promise<boolean> {
  if (DAILY_CAP <= 0 && MONTHLY_CAP <= 0) return false;
  await connectToDatabase();
  if (DAILY_CAP > 0) {
    const d = await OtpCounter.findById(dayKey());
    if ((d?.count ?? 0) >= DAILY_CAP) return true;
  }
  if (MONTHLY_CAP > 0) {
    const m = await OtpCounter.findById(monthKey());
    if ((m?.count ?? 0) >= MONTHLY_CAP) return true;
  }
  return false;
}

async function recordSend(): Promise<void> {
  const ops: Promise<unknown>[] = [];
  if (DAILY_CAP > 0) ops.push(OtpCounter.updateOne({ _id: dayKey() }, { $inc: { count: 1 } }, { upsert: true }));
  if (MONTHLY_CAP > 0) ops.push(OtpCounter.updateOne({ _id: monthKey() }, { $inc: { count: 1 } }, { upsert: true }));
  await Promise.all(ops);
}

/**
 * Layer A gate for externally-sent OTPs (e.g. Firebase sends the SMS from the
 * browser). Returns false when the cap is reached; otherwise reserves one send.
 */
export async function reserveSend(): Promise<boolean> {
  if (await capReached()) return false;
  await recordSend();
  return true;
}

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function storeCode(phoneE164: string, code: string) {
  await connectToDatabase();
  const codeHash = await hashPassword(code);
  await OtpChallenge.findOneAndUpdate(
    { phone: phoneE164 },
    { phone: phoneE164, codeHash, expiresAt: new Date(Date.now() + CODE_TTL_MS), attempts: 0 },
    { upsert: true },
  );
}

export async function sendOtp(phoneE164: string): Promise<OtpResult> {
  const live = smsLocalConfigured() || Boolean(twilioEnv());

  // Layer A: hard stop once the configured cap is reached (real providers only —
  // the dev fallback is free, so it is never capped).
  if (live && (await capReached())) {
    return { ok: false, error: "cap_reached" };
  }

  const code = genCode();
  await storeCode(phoneE164, code);
  const message = `Your OROVA verification code is ${code}. It expires in 5 minutes. Do not share it with anyone.`;

  // 1. SmsLocal (India, no DLT) — preferred when configured.
  if (smsLocalConfigured()) {
    const number10 = phoneE164.replace(/^\+?91/, ""); // SmsLocal expects 10-digit
    const r = await sendViaSmsLocal(number10, message);
    if (!r.ok) {
      console.error("SmsLocal send failed:", r.error);
      return { ok: false, error: `smslocal: ${r.error}` };
    }
    await recordSend();
    return { ok: true };
  }

  // 2. Twilio (SMS or WhatsApp) when configured.
  const env = twilioEnv();
  if (env) {
    const useSms = Boolean(env.smsFrom);
    const from = env.smsFrom ?? env.waFrom!;
    const params: Record<string, string> = {
      From: from,
      To: useSms ? phoneE164 : `whatsapp:${phoneE164}`,
    };
    if (!useSms && env.contentSid) {
      params.ContentSid = env.contentSid;
      params.ContentVariables = JSON.stringify({ "1": code });
    } else {
      params.Body = message;
    }

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${env.sid}:${env.token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });
    if (!res.ok) {
      console.error("Twilio send failed:", res.status, await res.text());
      return { ok: false, error: "send_failed" };
    }
    await recordSend();
    return { ok: true };
  }

  // 3. DEV fallback — no provider configured.
  console.log(`\n[DEV OTP] ${phoneE164} -> ${code}  (no SMS provider configured; no real message sent)\n`);
  return { ok: true, dev: true };
}

export async function checkOtp(phoneE164: string, code: string): Promise<OtpResult> {
  await connectToDatabase();
  const challenge = await OtpChallenge.findOne({ phone: phoneE164 });
  if (!challenge) return { ok: false, error: "expired" };

  if (challenge.expiresAt.getTime() < Date.now()) {
    await challenge.deleteOne();
    return { ok: false, error: "expired" };
  }
  if ((challenge.attempts ?? 0) >= MAX_ATTEMPTS) {
    await challenge.deleteOne();
    return { ok: false, error: "too_many" };
  }

  const match = await verifyPassword(code, challenge.codeHash);
  if (!match) {
    challenge.attempts = (challenge.attempts ?? 0) + 1;
    await challenge.save();
    return { ok: false, error: "invalid" };
  }

  await challenge.deleteOne();
  return { ok: true };
}
