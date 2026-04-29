import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";

// Register CustomEase so it's ready app-wide
if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
  
  // Define Ryvon Easing System — using simpler, faster curves
  CustomEase.create("ryvon-primary", "0.22,1,0.36,1");
  CustomEase.create("ryvon-snappy", "0.4,0,0.2,1");
  CustomEase.create("ryvon-soft", "0.25,0.1,0.25,1");
}

export const MOTION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.35,
  xl: 0.5
};
