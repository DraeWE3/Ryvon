import { streamObject } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const imageDocumentHandler = createDocumentHandler<"image">({
  kind: "image",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: myProvider.languageModel("artifact-model"),
      system: "Generate a description or representational content for the image requested. For now, we only support generating image metadata.",
      prompt: title,
      schema: z.object({
        description: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { description } = object;
  
        if (description) {
          dataStream.write({
            type: "data-imageDelta",
            data: description ?? "",
            transient: true,
          });

          draftContent = description;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    return document.content ?? '';
  },
});