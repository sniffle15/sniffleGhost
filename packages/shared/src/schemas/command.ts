import { z } from "zod";

export const CommandTypeSchema = z.enum(["SLASH", "PREFIX"]);
export const EventTypeSchema = z.enum([
  "MESSAGE_CREATE",
  "MESSAGE_DELETE",
  "MESSAGE_UPDATE",
  "CHANNEL_CREATE",
  "CHANNEL_DELETE",
  "CHANNEL_UPDATE",
  "VOICE_CHANNEL_JOIN",
  "VOICE_CHANNEL_LEAVE",
  "VOICE_CHANNEL_MOVE",
  "MEMBER_JOIN",
  "MEMBER_LEAVE"
]);

export const CommandPermissionsSchema = z.object({
  adminOnly: z.boolean().default(false),
  roleAllowlist: z.array(z.string()).default([]),
  channelAllowlist: z.array(z.string()).default([])
});

export const CommandCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: CommandTypeSchema,
  options: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1).optional(),
        type: z.enum(["string", "int", "bool", "user", "channel", "role"]).default("string"),
        required: z.boolean().default(false)
      })
    )
    .optional(),
  permissions: CommandPermissionsSchema.optional(),
  cooldownSeconds: z.number().int().min(0).default(0)
});

export const CommandUpdateSchema = CommandCreateSchema.partial();

export const CommandVersionCreateSchema = z.object({
  notes: z.string().optional()
});

export const EventCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  eventType: EventTypeSchema
});

export const EventUpdateSchema = EventCreateSchema.partial();

