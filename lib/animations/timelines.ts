import { gsap } from "gsap";
import { MOTION } from "./motion";

/**
 * Reusable Stagger Reveal Timeline
 * A premium staggered fade-up for grid items or lists.
 */
export const staggerReveal = (targets: gsap.DOMTarget | string, delay: number = 0) => {
  return gsap.fromTo(
    targets,
    { y: 24, opacity: 0, scale: 0.98 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: MOTION.base,
      ease: "ryvon-primary",
      delay: delay,
      stagger: {
        each: 0.06,
        from: "start",
      },
    }
  );
};

/**
 * Container -> Children Choreography
 * Combines a high-level container fade with a layered child stagger.
 */
export const containerSequence = (
  container: gsap.DOMTarget | string, 
  items: gsap.DOMTarget | string,
  delay: number = 0
) => {
  const tl = gsap.timeline({ delay });

  tl.fromTo(
    container,
    { opacity: 0 },
    { opacity: 1, duration: MOTION.fast, ease: "ryvon-soft" }
  ).add(staggerReveal(items), "-=0.1"); // Overlap slightly for premium feel

  return tl;
};

/**
 * Multi-Layered Drawer Entrance
 * Slides the panel in from right, then smartly staggers the inner content.
 */
export const drawerEnter = (
  panel: gsap.DOMTarget | string, 
  content: gsap.DOMTarget | string
) => {
  const tl = gsap.timeline();

  tl.fromTo(
    panel,
    { x: "100%", opacity: 0 },
    {
      x: "0%",
      opacity: 1,
      duration: MOTION.slow,
      ease: "ryvon-primary",
    }
  ).fromTo(
    content,
    { y: 20, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: MOTION.base,
      ease: "ryvon-primary",
      stagger: 0.04,
    },
    "-=0.3"
  );

  return tl;
};
