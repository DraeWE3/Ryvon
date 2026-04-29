import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";

// Register CustomEase so it's ready app-wide
if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
  
  // Define Ryvon Easing System
  // Smooth + premium (Hero reveals, slow slides)
  CustomEase.create("ryvon-primary", "0.22,1,0.36,1");
  // Fast UI (Micro-interactions, button active states)
  CustomEase.create("ryvon-snappy", "0.4,0,0.2,1");
  // Subtle (Fades, non-intrusive background shifts)
  CustomEase.create("ryvon-soft", "0.25,0.1,0.25,1");
}

export const MOTION = {
  fast: 0.18,
  base: 0.28,
  slow: 0.5,
  xl: 0.8
};
