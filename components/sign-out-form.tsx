"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export const SignOutForm = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  return (
    <button
      className="w-full px-1 py-0.5 text-left text-red-500 disabled:opacity-50"
      type="button"
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        await signOut({
          callbackUrl: "/",
        });
      }}
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
};
