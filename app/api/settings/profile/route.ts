import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { updateUserProfile } from "@/lib/db/queries";

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || session.user.type === "guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, companyName, timezone, image } = body;

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (image !== undefined) updateData.image = image;

    await updateUserProfile(session.user.id, updateData);

    return NextResponse.json({ success: true, message: "Profile updated successfully." });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
