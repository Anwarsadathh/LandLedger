// SmsLocal HTTP SMS API (app.smslocal.in) — works on all Indian numbers.
// GET https://app.smslocal.in/api/smsapi?key=&route=&sender=&number=&sms=&templateid=
// Response: a numeric message id on success, or an error code (101–111) on failure.

const ENDPOINT = "https://app.smslocal.in/api/smsapi";

const ERROR_CODES: Record<string, string> = {
  "101": "Invalid user (API key)",
  "102": "Invalid sender ID",
  "103": "Invalid contact(s)",
  "104": "Invalid route",
  "105": "Invalid message",
  "106": "Spam blocked",
  "107": "Promotional block",
  "108": "Low credits in the specified route",
  "109": "Promotional route only works 9am–8:45pm",
  "110": "Invalid DLT Template ID",
  "111": "No SMSC",
};

export function smsLocalConfigured(): boolean {
  return Boolean(process.env.SMSLOCAL_API_KEY);
}

export async function sendViaSmsLocal(
  number10: string,
  message: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.SMSLOCAL_API_KEY;
  if (!key) return { ok: false, error: "not_configured" };

  const url = new URL(ENDPOINT);
  url.searchParams.set("key", key);
  url.searchParams.set("route", process.env.SMSLOCAL_ROUTE || "2"); // 2 = OTP
  if (process.env.SMSLOCAL_SENDER) url.searchParams.set("sender", process.env.SMSLOCAL_SENDER);
  url.searchParams.set("number", number10);
  url.searchParams.set("sms", message);
  if (process.env.SMSLOCAL_TEMPLATE_ID) url.searchParams.set("templateid", process.env.SMSLOCAL_TEMPLATE_ID);

  let res: Response;
  try {
    res = await fetch(url, { method: "GET" });
  } catch {
    return { ok: false, error: "network" };
  }
  const text = (await res.text()).trim();

  // An error code is one of the known 101–111 values; anything else numeric is a
  // message id (success).
  if (ERROR_CODES[text]) return { ok: false, error: `${text} ${ERROR_CODES[text]}` };
  if (/^\d+$/.test(text)) return { ok: true, id: text };
  return { ok: false, error: text || `HTTP ${res.status}` };
}
