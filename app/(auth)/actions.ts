"use server";

import { z } from "zod";
import { AuthError } from "next-auth";

import { createUser, getUser, createVerificationCode } from "@/lib/db/queries";
import { sendVerificationEmail } from "@/lib/email";

import { signIn } from "./auth";

const authFormSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data" | "unverified";
  email?: string;
  message?: string;
};

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const [user] = await getUser(validatedData.email);
    if (user && !user.isVerified) {
      const code = await createVerificationCode(validatedData.email);
      const emailSent = await sendVerificationEmail(validatedData.email, code);
      if (!emailSent) return { status: "failed", message: "Failed to send verification email. (Check Resend Sandbox limits)" };
      return { status: "unverified", email: validatedData.email };
    }

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }
    if (error instanceof AuthError) {
      return { status: "failed" };
    }

    // Must re-throw NEXT_REDIRECT and other internal Next.js errors
    throw error;
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data"
    | "requires_verification";
  email?: string;
  message?: string;
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      if (!user.isVerified) {
        // Resend code if unverified
        const code = await createVerificationCode(validatedData.email);
        const emailSent = await sendVerificationEmail(validatedData.email, code);
        if (!emailSent) return { status: "failed", message: "Failed to send verification email. (Check Resend Sandbox limits)" } as RegisterActionState;
        return { status: "requires_verification", email: validatedData.email } as RegisterActionState;
      }
      return { status: "user_exists" } as RegisterActionState;
    }
    await createUser(validatedData.email, validatedData.password);
    
    const code = await createVerificationCode(validatedData.email);
    const emailSent = await sendVerificationEmail(validatedData.email, code);
    if (!emailSent) return { status: "failed", message: "Failed to send verification email. (Check Resend Sandbox limits)" };

    return { status: "requires_verification", email: validatedData.email };
  } catch (error: any) {
    console.error("Register action error:", error);
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed", message: error.message || "Unknown error" };
  }
};

export const resendVerificationCode = async (email: string) => {
  try {
    const [user] = await getUser(email);
    if (!user || user.isVerified) {
      return { success: false, error: "User not found or already verified." };
    }
    
    const code = await createVerificationCode(email);
    const emailSent = await sendVerificationEmail(email, code);
    
    if (!emailSent) {
      return { success: false, error: "Failed to send email. (Check Resend Sandbox limits)" };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return { success: false, error: error.message || "Failed to resend code." };
  }
};
