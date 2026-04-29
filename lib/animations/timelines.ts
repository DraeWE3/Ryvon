import { gsap } from "gsap";
import { MOTION } from "./motion";

/**
 * Reusable Stagger Reveal Timeline
 * A premium staggered fade-up for grid items or lists.
 * Optimized: faster durations, tighter stagger for snappy feel.
 */
export const staggerReveal = (targets: gsap.DOMTarget | string, delay: number = 0) => {
  return gsap.fromTo(
    targets,
    { y: 12, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: MOTION.fast,
      ease: "power2.out",
      delay: delay,
      stagger: {
        each: 0.03,
        from: "start",
      },
    }
  );
};

/**
 * Container -> Children Choreography
 * Optimized: instant container reveal, fast child stagger.
 */
export const containerSequence = (
  container: gsap.DOMTarget | string, 
  items: gsap.DOMTarget | string,
  delay: number = 0
) => {
  const tl = gsap.timeline({ delay });

  tl.set(container, { opacity: 1 })
    .add(staggerReveal(items));

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
      duration: MOTION.base,
      ease: "power2.out",
    }
  ).fromTo(
    content,
    { y: 12, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: MOTION.fast,
      ease: "power2.out",
      stagger: 0.02,
    },
    "-=0.15"
  );

  return tl;
};
