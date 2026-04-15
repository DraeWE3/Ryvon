import { tool } from "ai";
import { z } from "zod";
import { getWorkflowsByUserId, getWorkflowById, updateWorkflow } from "@/lib/db/queries";
import type { Session } from "next-auth";

type ManageWorkflowsProps = {
  session: Session;
};

export const manageWorkflows = ({ session }: ManageWorkflowsProps) =>
  tool({
    description: "Manage, list, or enable/disable the user's automated workflows.",
    inputSchema: z.object({
      action: z.enum(["list", "get", "enable", "disable"]),
      workflowId: z.string().optional().describe("The ID of the workflow to perform an action on. Required for get, enable, disable.")
    }),
    execute: async ({ action, workflowId }) => {
      if (!session?.user?.id) {
        return { success: false, error: "Unauthorized. User not logged in." };
      }

      try {
        if (action === "list") {
          const workflows = await getWorkflowsByUserId({ userId: session.user.id });
          return {
            success: true,
            workflows: workflows.map(w => ({
              id: w.id,
              name: w.name,
              category: w.category,
              triggerType: w.triggerType,
              active: w.active,
            }))
          };
        }

        if (!workflowId) {
          return { success: false, error: "workflowId is required for this action." };
        }

        const workflow = await getWorkflowById({ id: workflowId });
        if (!workflow) {
          return { success: false, error: "Workflow not found." };
        }

        if (workflow.userId !== session.user.id) {
          return { success: false, error: "Unauthorized access to workflow." };
        }

        if (action === "get") {
          return { success: true, workflow };
        }

        if (action === "enable" || action === "disable") {
          const isActive = action === "enable";
          const updated = await updateWorkflow({
            id: workflowId,
            data: { active: isActive },
          });
          return { 
            success: true, 
            message: `Workflow successfully ${action}d.`,
            workflow: { id: updated.id, name: updated.name, active: updated.active }
          };
        }

        return { success: false, error: "Unknown action" };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }
    }
  });
