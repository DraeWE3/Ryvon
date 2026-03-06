"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { type LoginActionState, login } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [state, formAction, isPending] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: "idle",
    }
  );

  const { update: updateSession } = useSession();

  // Handle hydration - ensure component is mounted before showing animations
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

  // Prevent hydration mismatch by not animating until mounted
  const motionProps = isMounted
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      }
    : {};

  return (
    <motion.div 
      {...motionProps}
      className="relative min-h-screen overflow-hidden"
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