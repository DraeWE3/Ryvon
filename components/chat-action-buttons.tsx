"use client";

import { memo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/**
 * AnimatedActionButton Component
 * Handles the individual button staggered reveal and hover interaction.
 */
function AnimatedActionButton({ 
  onClick, 
  icon, 
  label, 
  index 
}: { 
  onClick: () => void; 
  icon: string; 
  label: string; 
  index: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline({
      delay: index * 0.2,
    });

    // Premium Staggered Intro
    tl.to(containerRef.current, { 
      opacity: 1, 
      y: 0,
      duration: 0.6, 
      ease: "power3.out" 
    });

    // Activation Feedback (Subtle Scale Surge)
    tl.to(containerRef.current, {
      scale: 1.03,
      duration: 0.15,
      ease: "power2.out",
    }, "-=0.35")
    .to(containerRef.current, {
      scale: 1,
      duration: 0.4,
      ease: "elastic.out(1, 0.4)",
    });

  }, { scope: containerRef });

  const handleMouseEnter = () => {
    gsap.to(containerRef.current, {
      backgroundColor: "rgba(50, 162, 242, 0.12)",
      borderColor: "rgba(50, 162, 242, 0.3)",
      duration: 0.3,
    });
    gsap.to(iconRef.current, {
      y: -2,
      rotate: index === 0 ? 5 : (index === 1 ? -5 : 0),
      scale: 1.1,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  const handleMouseLeave = () => {
    gsap.to(containerRef.current, {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
      borderColor: "rgba(255, 255, 255, 0.12)",
      duration: 0.3,
    });
    gsap.to(iconRef.current, {
      y: 0,
      rotate: 0,
      scale: 1,
      duration: 0.4, 
      ease: "power2.inOut"
    });
  };

  return (
    <div 
      ref={containerRef}
      className="btn2 btn premium-btn cursor-pointer relative overflow-hidden" 
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ 
        opacity: 0,
        transform: 'translateY(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)'
      }}
    >
      <img ref={iconRef} src={icon} alt="" className="z-10 relative" />
      <p className="z-10 relative">{label}</p>
    </div>
  );
}

function PureChatActionButtons() {
  const router = useRouter();

  return (
    <div className="buttons">
      <AnimatedActionButton 
        index={0}
        onClick={() => {}}
        icon="/img/image.svg"
        label="Create image"
      />
      <AnimatedActionButton 
        index={1}
        onClick={() => router.push('/tts')}
        icon="/img/mic.svg"
        label="Generate Voice"
      />
      <AnimatedActionButton 
        index={2}
        onClick={() => router.push('/call-agent')}
        icon="/img/export.svg"
        label="Automate Call"
      />
    </div>
  );
}

export const ChatActionButtons = memo(PureChatActionButtons);
