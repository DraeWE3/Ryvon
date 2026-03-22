import { NextRequest, NextResponse } from "next/server";
import { createWorkflow } from "@/lib/db/queries";
import { auth } from "@/app/(auth)/auth";

// POST /api/workflows/manual — create a workflow with manually defined steps (no AI)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, triggerType, triggerValue, triggerDescription, steps, active } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid name" },
        { status: 400 }
      );
    }

    const saved = await createWorkflow({
      userId: session.user.id,
      name: name.trim(),
      triggerType: triggerType || "manual",
      triggerValue: triggerValue || "manual",
      triggerDescription: triggerDescription || name,
      category: "General",
      icon: "Zap",
      steps: steps || [],
      active: active ?? true,
    });

    return NextResponse.json({
      ...saved,
      trigger_type: saved.triggerType,
      trigger_value: saved.triggerValue,
      trigger_description: saved.triggerDescription,
    });
  } catch (error) {
    console.error("Manual workflow creation error:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
