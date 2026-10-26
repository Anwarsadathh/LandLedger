import { z } from "zod";

export const createRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  phone: z.string().min(6).max(20),
  comment: z.string().max(1000).optional(),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
