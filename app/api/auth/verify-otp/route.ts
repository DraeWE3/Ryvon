import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/queries"; // We'll just import from schema directly if needed, but we can do logic here
import { verificationCode, user } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { signIn } from "@/app/(auth)/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json();

    if (!email || !code || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Since we can't easily import db object if it's not exported cleanly, let's use globalForDb if available
    // Actually, db is exported from lib/db/queries.ts
    const { db } = await import("@/lib/db/queries");

    // Check code (trimming to handle accidental spaces from copy-pasting)
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedCode = code.trim();



    const [vc] = await db
      .select()
      .from(verificationCode)
      .where(
        and(
          eq(verificationCode.email, sanitizedEmail), 
          eq(verificationCode.code, sanitizedCode)
        )
      );

    if (!vc) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    if (new Date() > vc.expiresAt) {
      return NextResponse.json({ error: "Verification code expired" }, { status: 400 });
    }

    // Verify user
    await db.update(user)
      .set({ isVerified: true })
      .where(eq(user.email, sanitizedEmail));
    
    // Delete code
    await db.delete(verificationCode)
      .where(eq(verificationCode.email, sanitizedEmail));

    // Send Welcome Email
    const { sendWelcomeEmail } = await import("@/lib/email");
    await sendWelcomeEmail(sanitizedEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
