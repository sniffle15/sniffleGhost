import { z } from "zod";

export const BotCreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  applicationId: z.string().min(3),
  token: z.string().min(10),
  testGuildId: z.string().optional(),
  prefix: z.string().min(1).max(5).default("!")
});

export const BotUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  testGuildId: z.string().optional(),
  prefix: z.string().min(1).max(5).optional(),
  token: z.string().min(10).optional(),
  status: z.enum(["stopped", "starting", "running", "error"]).optional()
});
