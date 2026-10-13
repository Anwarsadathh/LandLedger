import { z } from "zod";

export const createEnquirySchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal("")),
  message: z.string().max(2000).optional(),
  consent: z.object({
    accepted: z.literal(true, { message: "Consent to be contacted is required" }),
    noticeVersion: z.string().min(1),
    text: z.string().optional(),
  }),
  source: z
    .object({
      channel: z.string().default("WEB"),
      campaign: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
    })
    .optional(),
});

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
