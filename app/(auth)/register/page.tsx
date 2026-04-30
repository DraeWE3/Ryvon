"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn as nextAuthSignIn } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { type RegisterActionState, register } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [state, formAction, isPending] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: "idle",
    }
  );

  const { data: session, status: sessionStatus, update: updateSession } = useSession();

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.push("/");
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (state.status === "user_exists") {
      toast({ type: "error", description: "Account already exists!" });
    } else if (state.status === "failed") {
      toast({ type: "error", description: "Failed to create account!" });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success") {
      toast({ type: "success", description: "Account created successfully!" });
      setIsSuccessful(true);
      updateSession();
      router.refresh();
      router.push("/welcome");
    }
  }, [state.status, router, updateSession]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    
    try {
      // Securely fetch the NextAuth CSRF token
      const res = await fetch("/api/auth/csrf");
      const { csrfToken } = await res.json();

      // Create a hidden form to submit a POST request in a new tab
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signin/google";
      form.target = "_blank";

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
      document.body.removeChild(form);
      
      // Stop loading spinner after 5 seconds in case they close the tab
      setTimeout(() => setIsGoogleLoading(false), 5000);
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

            <motion.form 
              {...(isMounted ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.25 }
              } : {})}
              action={formAction} 
              className="login-form"
            >
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
                    defaultValue={email}
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
                    type="password" 
                    id="password" 
                    name="password" 
                    placeholder="Password"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="login-button" disabled={isPending || isSuccessful}>
                {isPending || isSuccessful ? "Signing up..." : "Sign Up"}
              </button>
            </motion.form>
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
    </motion.div>
  );
}

