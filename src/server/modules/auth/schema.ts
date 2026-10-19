import { z } from "zod";

// Indian mobile number: strip spaces/dashes and a +91 / 91 / 0 prefix, then
// require a 10-digit number starting 6–9. Stored normalized as 10 digits.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(?:\+91|91|0)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"));

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updatePhoneSchema = z.object({ phone: phoneSchema });

export const otpRequestSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().max(120).optional(),
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{4,8}$/, "Enter the code you received"),
  name: z.string().trim().max(120).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdatePhoneInput = z.infer<typeof updatePhoneSchema>;
