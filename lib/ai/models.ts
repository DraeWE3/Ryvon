export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "GPT-4o",
    description: "OpenAI's most advanced multimodal model with vision and text capabilities",
  },
  {
    id: "chat-model-reasoning",
    name: "o1-preview",
    description: "OpenAI's advanced reasoning model that uses chain-of-thought for complex problems",
  },
];