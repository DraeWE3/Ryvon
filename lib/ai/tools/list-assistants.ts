import { tool } from "ai";
import { z } from "zod";
import { ASSISTANTS } from "../assistants";

export const listAssistants = () =>
  tool({
    description: "Get a list of available AI Voice Agents (assistants) that can be used for phone calls. Use this when the user hasn't specified which agent they want to use for a call.",
    inputSchema: z.object({}),
    execute: async () => {
      return {
        success: true,
        assistants: ASSISTANTS,
      };
    },
  });
