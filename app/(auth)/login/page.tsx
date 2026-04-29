"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn as nextAuthSignIn } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { type LoginActionState, login } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [state, formAction, isPending] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: "idle",
    }
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (state.status === "failed") {
      toast({
        type: "error",
        description: "Invalid credentials!",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      updateSession();
      router.push("/");
    }
  }, [state.status, router, updateSession]);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    nextAuthSignIn("google", { callbackUrl: "/" });
  };

  const motionProps = isMounted
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      }
    : {};

  return (
    <motion.div 
      {...motionProps}
      className="relative min-h-[100dvh] overflow-hidden"
    >
      <div className="background-container" />
      
      <div className="page-wrapper relative z-10">
        <header className="auth-header">
          <motion.div
            {...(isMounted ? {
              initial: { y: -20, opacity: 0 },
              animate: { y: 0, opacity: 1 },
              transition: { delay: 0.2 }
            } : {})}
            className="auth-logo"
          >
            <Image
              src="/img/Ryvon-wordmark.svg"
              alt="Ryvon AI"
              width={200}
              height={50}
              priority
              style={{ width: '10rem', height: 'auto' }}
            />
          </motion.div>
        </header>

        <main className="auth-main-content">
          <motion.div 
            {...(isMounted ? {
              initial: { scale: 0.9, opacity: 0, filter: 'blur(10px)' },
              animate: { scale: 1, opacity: 1, filter: 'blur(0px)' },
              transition: { type: "spring", stiffness: 260, damping: 20 }
            } : {})}
            className="login-card"
          >
            <span className="circle-top" />
            <span className="circle-bottom" />

            <motion.h1 
              {...(isMounted ? {
                initial: { y: 10, opacity: 0 },
                animate: { y: 0, opacity: 1 },
                transition: { delay: 0.3 }
              } : {})}
              className="card-title"
            >
              Login
            </motion.h1>
            
            <motion.div 
              {...(isMounted ? {
                initial: { y: 10, opacity: 0 },
                animate: { y: 0, opacity: 1 },
                transition: { delay: 0.4 }
              } : {})}
              className="toggle-container"
            >
              <Link href="/login" className="toggle-option active">Login</Link>
              <Link href="/register" className="toggle-option">Sign up</Link>
            </motion.div>

            {/* Google Sign-In */}
            <motion.div
              {...(isMounted ? {
                initial: { y: 10, opacity: 0 },
                animate: { y: 0, opacity: 1 },
                transition: { delay: 0.45 }
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
                transition: { delay: 0.48 }
              } : {})}
              className="auth-divider"
            >
              <span>or</span>
            </motion.div>

            <motion.form 
              {...(isMounted ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.5 }
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
                {isPending || isSuccessful ? "Logging in..." : "Login"}
              </button>
            </motion.form>
          </motion.div>
        </main>

        <footer className="auth-footer">
          <motion.p 
            {...(isMounted ? {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { delay: 0.6 }
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