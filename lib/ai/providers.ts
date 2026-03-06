import { openai } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // Main chat model with vision capabilities
        "chat-model": openai("gpt-4-turbo"),
        
        // Reasoning model - use gpt-4-turbo (o1 models may not be available)
        "chat-model-reasoning": wrapLanguageModel({
          model: openai("gpt-4-turbo"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        
        // Title generation - use faster/cheaper model
        "title-model": openai("gpt-4o-mini"),
        
        // Artifact generation
        "artifact-model": openai("gpt-4-turbo"),
      },
    });