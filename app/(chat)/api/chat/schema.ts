import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.string(), // Allow all media types for now
  name: z.string().min(1).max(255),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string(),
  message: z.object({
    id: z.string(),
    role: z.enum(["user"]),
    parts: z.array(z.any()),
  }),
  selectedChatModel: z.enum(["chat-model", "chat-model-reasoning"]),
  selectedVisibilityType: z.enum(["public", "private"]),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
