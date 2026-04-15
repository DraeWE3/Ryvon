import { tool } from "ai";
import { z } from "zod";
import { getConnectorsByUserId } from "@/lib/db/queries";
import type { Session } from "next-auth";

export const checkConnectors = ({ session }: { session: Session }) => 
  tool({
    description: "Check which third-party integrations (connectors) the user has successfully connected/authenticated with (e.g., Slack, Gmail, Notion, Salesforce, HubSpot).",
    inputSchema: z.object({}),
    execute: async () => {
      if (!session?.user?.id) {
        return { success: false, error: "Unauthorized. User not logged in." };
      }

      try {
        const connectors = await getConnectorsByUserId({ userId: session.user.id });
        return {
          success: true,
          connectors: connectors.map(c => ({
            provider: c.provider,
            accountEmail: c.accountEmail,
            accountName: c.accountName,
            connectedAt: c.connectedAt,
          }))
        };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }
    }
  });
