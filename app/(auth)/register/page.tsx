"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn as nextAuthSignIn } from "next-auth/react";
import { useActionState, useEffect, useState, useRef } from "react";
import { Eye, EyeOff, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { AuthNotificationModal, type AuthNotificationType } from "@/components/auth-notification-modal";
import { type RegisterActionState, register, resendVerificationCode } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifyingState, setIsVerifyingState] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const lastStatusRef = useRef<string | null>(null);
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: AuthNotificationType;
    title: string;
    message: string;
    onConfirm?: () => void;
    hideIcon?: boolean;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const [state, formAction, isPending] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: "idle",
    }
  );

  const { data: session, status: sessionStatus, update: updateSession } = useSession();

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.type !== "guest") {
      router.push("/");
    }
  }, [sessionStatus, session, router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only show the modal once per state status change to prevent it from popping up again on re-renders
    if (state.status === "idle" || state.status === lastStatusRef.current) return;
    
    lastStatusRef.current = state.status;

    if (state.status === "user_exists") {
      setModalState({ isOpen: true, type: "error", title: "Registration Failed", message: "Account already exists!", hideIcon: true });
    } else if (state.status === "failed") {
      setModalState({ isOpen: true, type: "error", title: "Registration Failed", message: state.message || "Failed to create account!" });
    } else if (state.status === "invalid_data") {
      setModalState({ isOpen: true, type: "error", title: "Invalid Data", message: "Failed validating your submission!" });
    } else if (state.status === "requires_verification") {
      setIsVerifyingState(true);
      toast.success("We've sent a 6-digit code to your email.");
    } else if (state.status === "success") {
      setModalState({ isOpen: true, type: "success", title: "Success", message: "Account created successfully!" });
      setIsSuccessful(true);
      updateSession();
      router.refresh();
      router.push("/welcome");
    }
  }, [state.status, router, updateSession]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) return;
    
    setIsGoogleLoading(true); // Reusing this for loading state
    try {
      const formEmail = (document.getElementById("email") as HTMLInputElement)?.value || state.email || email;
      const formPassword = password || (document.getElementById("password") as HTMLInputElement)?.value;
      
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formEmail, code: verificationCode, password: formPassword })
      });
      const data = await res.json();
      
      if (data.success) {
        // Now login
        const result = await nextAuthSignIn("credentials", {
          email: email.trim().toLowerCase(),
          password: password,
          redirect: true,
          callbackUrl: "/"
        });
        setModalState({ 
          isOpen: true, 
          type: "success", 
          title: "Verified", 
          message: "Your account has been verified!",
          onConfirm: () => {
             updateSession();
             router.push("/");
          }
        });
      } else {
        setModalState({ isOpen: true, type: "error", title: "Verification Failed", message: data.error || "Invalid code." });
      }
    } catch (err) {
      setModalState({ isOpen: true, type: "error", title: "Error", message: "An unexpected error occurred." });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      const formEmail = (document.getElementById("email") as HTMLInputElement)?.value || state.email || email;
      if (!formEmail) {
        setModalState({ isOpen: true, type: "error", title: "Error", message: "Email not found." });
        return;
      }
      
      const res = await resendVerificationCode(formEmail);
      if (res.success) {
        toast.success("A new verification code has been sent to your email.");
      } else {
        toast.error(res.error || "Failed to resend code.");
      }
    } catch (err) {
      setModalState({ isOpen: true, type: "error", title: "Error", message: "Failed to resend code." });
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    
    try {
      // Securely fetch the NextAuth CSRF token
      const res = await fetch("/api/auth/csrf");
      const { csrfToken } = await res.json();

      // Create a hidden form to submit a POST request in the SAME tab
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signin/google";

      const csrfInput = document.createElement("input");
      csrfInput.type = "hidden";
      csrfInput.name = "csrfToken";
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement("input");
      callbackInput.type = "hidden";
      callbackInput.name = "callbackUrl";
      callbackInput.value = window.location.origin + "/";
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error("Failed to start Google auth:", error);
      setIsGoogleLoading(false);
    }
  };

  const motionProps = isMounted
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {};

  return (
    <motion.div 
      {...motionProps}
      className="relative min-h-[100dvh] overflow-hidden"
    >
      <div className="background-container" />
      
      <div className="page-wrapper relative z-10">
        <header className="auth-header">
          <motion.img 
            {...(isMounted ? {
              initial: { y: -10, opacity: 0 },
              animate: { y: 0, opacity: 1 },
              transition: { delay: 0.05 }
            } : {})}
            src="/img/Ryvon-wordmark.svg" 
            alt="Ryvon AI" 
            className="auth-logo" 
          />
        </header>

        <main className="auth-main-content">
          <motion.div 
            {...(isMounted ? {
              initial: { scale: 0.95, opacity: 0 },
              animate: { scale: 1, opacity: 1 },
              transition: { type: "spring", stiffness: 300, damping: 25 }
            } : {})}
            className="login-card"
          >
            <span className="circle-top" />
            <span className="circle-bottom" />

            <motion.h1 
              {...(isMounted ? {
                initial: { y: 5, opacity: 0 },
                animate: { y: 0, opacity: 1 },
                transition: { delay: 0.1 }
              } : {})}
              className="card-title"
            >
              Sign Up
            </motion.h1>
            
            <motion.div 
              {...(isMounted ? {
                initial: { y: 5, opacity: 0 },
                animate: { y: 0, opacity: 1 },
                transition: { delay: 0.15 }
              } : {})}
              className="toggle-container"
            >
              <Link href="/login" className="toggle-option2">Login</Link>
              <Link href="/register" className="toggle-option2 toggle-option2-active">Sign up</Link>
            </motion.div>

            {/* Google Sign-Up */}
            <motion.div
              {...(isMounted ? {
                initial: { y: 5, opacity: 0 },
                animate: { y: 0, opacity: 1 },
                transition: { delay: 0.2 }
              } : {})}
            >
              <button
                type="button"
                className="google-btn"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isGoogleLoading ? "Connecting..." : "Continue with Google"}
              </button>
            </motion.div>

            {/* Divider */}
            <motion.div
              {...(isMounted ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.22 }
              } : {})}
              className="auth-divider"
            >
              <span>or</span>
            </motion.div>

            <motion.div
              {...(isMounted ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.25 }
              } : {})}
              className="card-body relative z-10 w-full"
            >
              <form action={formAction} className="login-form" style={{ display: isVerifyingState ? 'none' : 'flex' }}>
                <div className="input-group">
                  <label htmlFor="email" className="input-label">Email / Phone</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m2 7 10 6 10-6"/>
                    </svg>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      placeholder="Enter email or phone"
                      className="input-field"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="password" className="input-label">Password</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      id="password" 
                      name="password" 
                      placeholder="Password"
                      className="input-field"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="login-button" disabled={isPending || isSuccessful}>
                  {isPending || isSuccessful ? "Signing up..." : "Sign Up"}
                </button>
              </form>

              <form onSubmit={handleVerifyOTP} className="login-form" style={{ display: !isVerifyingState ? 'none' : 'flex' }}>
                <div className="input-group">
                  <label htmlFor="verificationCode" className="input-label flex flex-row items-center justify-between w-full mb-2">
                    <span className="font-semibold text-white/90">Verification Code</span>
                    <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded-md">Sent to your email</span>
                  </label>
                  <div className="input-wrapper mt-1">
                    <KeyRound className="input-icon w-5 h-5 text-white/50" />
                    <input 
                      type="text" 
                      id="verificationCode" 
                      name="verificationCode" 
                      placeholder="Enter 6-digit code"
                      className="input-field tracking-widest text-lg font-mono text-center"
                      required
                      maxLength={6}
                      value={verificationCode || ""}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="login-button mt-2 flex items-center justify-center gap-2"
                  disabled={isGoogleLoading || verificationCode.length !== 6}
                >
                  {isGoogleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isGoogleLoading ? "Verifying..." : "Verify Account"}
                </button>

                <div className="flex flex-col items-center gap-3 mt-6">
                  <button 
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isResending}
                    className="flex items-center gap-2 text-[13px] font-motive text-white/60 hover:text-white transition-colors"
                  >
                    <RefreshCw className={isResending ? "w-3 h-3 animate-spin" : "w-3 h-3"} />
                    {isResending ? "Resending..." : "Resend Code"}
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      setIsVerifyingState(false);
                      setVerificationCode("");
                      lastStatusRef.current = null;
                    }}
                    className="text-[13px] font-motive text-white/40 hover:text-white transition-colors underline underline-offset-2 decoration-white/20 hover:decoration-white/60"
                  >
                    Back to registration
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </main>

        <footer className="auth-footer">
          <motion.p 
            {...(isMounted ? {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { delay: 0.3 }
            } : {})}
            className="copyright"
          >
            Copyright © 2026 Ryvon Intelligence. All rights reserved.
          </motion.p>
        </footer>
      </div>

      <AuthNotificationModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        hideIcon={modalState.hideIcon}
      />
    </motion.div>
  );
}

