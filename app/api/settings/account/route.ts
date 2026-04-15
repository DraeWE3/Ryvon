import { NextResponse } from "next/server";
import { auth, signOut } from "@/app/(auth)/auth";
import { deleteUserCascade } from "@/lib/db/queries";

export async function DELETE() {
  try {
    const session = await auth();

    if (!session || !session.user || session.user.id === "guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cascade delete the user and all associated records
    await deleteUserCascade(session.user.id);

    return NextResponse.json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    console.error("Account Deletion Error:", error);
    return NextResponse.json(
      { error: "Failed to delete account." },
      { status: 500 }
    );
  }
}
