'use client';

import React, { useState } from 'react'
import Icon1 from "../../artifacts/image/down.svg"
import Icon2 from "../../artifacts/image/setting.svg"
import Logo from "../../artifacts/image/glass-ryvon.png"
import Logo2 from "../../artifacts/image/cortex.png" // Add your second logo
import Logo3 from "../../artifacts/image/voice.png" // Add your third logo
import Logo4 from "../../artifacts/image/flow.png" // Add your fourth logo
import Image from 'next/image'
import Play from "../../artifacts/image/play.svg"
import Next from "../../artifacts/image/next.svg"
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const WelcomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const slides = [
    {
      logo: Logo,
      className: "ry-icon-intel",
      title: "RYVON INTELLIGENCE",
      subtitle: "Your Intelligent AI Assistant",
      description: "Ryvon Command understands intent, reasons through tasks, and decides which agents to activate.",
      intro: "No switching tools. No manual workflows."
    },
    {
      logo: Logo2,
      className: "ry-icon-cortex",
      title: "Ryvon Cortex",
      subtitle: "Intelligent Conversation",
      description: "Automate complex tasks with natural language commands and intelligent processing.",
      intro: "This is where everything begins."
    },
    {
      logo: Logo3,
      className: "ry-icon-voice",
      title: "Ryvon Voice",
      subtitle: "Voice-Enabled AI Agents",
      description: "Ryvon Voice places calls, Generates your text to speech, and communicates at scale.",
      intro: "Designed for high-impact, real-world interactions"
    },
    {
      logo: Logo4,
      className: "ry-icon-flow",
      title: "Ryvon Flow",
      subtitle: "From intent to execution — automatically",
      description: "Ryvon Flow converts your goals into automated workflows across apps, tools, and systems.",
      intro: "You choose the outcome. Ryvon handles the process."
    }
  ];

  const handleSlideChange = (index: number) => {
    if (index === currentSlide) return;
    setCurrentSlide(index);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      handleSlideChange(currentSlide + 1);
    }
  };

  const handleStart = () => {
    router.push('/');
  };

  const handleWatchDemo = () => {
    console.log('Watch demo clicked');
  };

  return (
    <div className="welcome-page">
      <div className="welcome-top">
        <div className="mobile-nav-trigger" onClick={() => setIsSidebarOpen(true)}>
          <Menu color="white" size={24} />
        </div>

        <div className="desktop-nav">
          <div className="btn2 btn">
            <p>RyvonAI v10</p>
            <Image className="btn-img" src={Icon1} alt="Ryvon Icon" />
          </div>
          <div className="btn2 btn">
            <p>configuration</p>
            <Image className="btn-img" src={Icon2} alt="Ryvon Icon" />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            className="welcome-sidebar-overlay active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Content */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            className="welcome-sidebar open"
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            exit={{ x: -250 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="sidebar-close" onClick={() => setIsSidebarOpen(false)}>
              <X color="white" size={24} />
            </div>
            <div className="sidebar-items">
              <div className="btn2 btn">
                <p>RyvonAI v10</p>
                <Image className="btn-img" src={Icon1} alt="Ryvon Icon" />
              </div>
              <div className="btn2 btn">
                <p>configuration</p>
                <Image className="btn-img" src={Icon2} alt="Ryvon Icon" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="slide-card">
        <AnimatePresence mode="wait">
          <div className="card">
            <img
              className={`ry-icon ${slides[currentSlide].className}`}
              src={slides[currentSlide].logo.src}
              alt="Ryvon Icon"
            />

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {slides[currentSlide].title}
            </motion.h1>

            <motion.p 
              className="card-p1"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {slides[currentSlide].subtitle}
            </motion.p>

            <motion.p 
              className="card-p2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {slides[currentSlide].description}
            </motion.p>

            <motion.div 
              className="btn-con"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {currentSlide === 0 && (
                <>
                  <div className="btn" onClick={handleNext}>
                    <p>Get Started</p>
                    <Image
                      className="btn-img"
                      src={Next}
                      alt="Next Icon"
                    />
                  </div>
                  <div className="btn" onClick={handleWatchDemo}>
                    <p>Watch Demo</p>
                    <Image
                      className="btn-img"
                      src={Play}
                      alt="Play Icon"
                    />
                  </div>
                </>
              )}

              {(currentSlide === 1 || currentSlide === 2) && (
                <div className="btn" onClick={handleNext}>
                  <p>Next</p>
                  <Image
                    className="btn-img"
                    src={Next}
                    alt="Next Icon"
                  />
                </div>
              )}

              {currentSlide === 3 && (
                <div className="btn" onClick={handleStart}>
                  <p>Start</p>
                  <Image
                    className="btn-img"
                    src={Next}
                    alt="Start Icon"
                  />
                </div>
              )}
            </motion.div>

            <div className="indicator">
              {slides.map((_, index) => (
                <span
                  key={index}
                  className={`dot ${currentSlide === index ? 'dot-active' : ''}`}
                  onClick={() => handleSlideChange(index)}
                  style={{ cursor: 'pointer' }}
                ></span>
              ))}
            </div>
          </div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.p 
            key={`intro-${currentSlide}`}
            className="intro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {slides[currentSlide].intro}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default WelcomePage