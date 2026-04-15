'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { SidebarToggle } from '@/components/sidebar-toggle';

export default function TextToSpeechPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateSpeech = () => {
    if (!text.trim()) {
      setError('Please enter text');
      return;
    }
    // Store text in sessionStorage for the generate page to pick up
    sessionStorage.setItem('ryvon_tts_text', text);
    router.push('/tts/generate');
  };

  if (!mounted) return null;

  return (
    <>
      <div className="tts-page-container">
      <div className="tts-main-content chat">
        <div className='chat-top flex justify-between items-center w-full'>
          <div className="flex items-center gap-2">
            <SidebarToggle className="text-white" />
            <div className="btn2 btn desktop-only"><p>RyvonAI v1.0</p><img src="/img/down.svg" alt="" /></div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="right-btncon desktop-only">
              <div className="btn2 btn"><p>Configuration</p><img src="/img/setting.svg" alt="" /></div>
              <div className="btn2 btn"><p>Export</p><img src="/img/export.svg" alt="" /></div>
            </div>
            <div className="mobile-menu-btn" onClick={() => setIsMenuOpen(true)}>
              <Menu color="white" />
            </div>
          </div>
        </div>

        {/* Mobile Side Menu */}
        {isMenuOpen && (
          <>
            <div 
              className="side-menu-overlay active"
              onClick={() => setIsMenuOpen(false)}
            />
            <div 
              className={`side-menu ${isMenuOpen ? 'open' : ''}`}
            >
                <div className="menu-header">
                  <div className="btn2 btn"><p>RyvonAI v1.0</p><img src="/img/down.svg" alt="" /></div>
                  <div onClick={() => setIsMenuOpen(false)}>
                    <X color="white" />
                  </div>
                </div>
                <div className="menu-items">
                  <div className="btn2 btn"><p>Configuration</p><img src="/img/setting.svg" alt="" /></div>
                  <div className="btn2 btn"><p>Export</p><img src="/img/export.svg" alt="" /></div>
                </div>
              </div>
            </>
          )}

        <div className="chat-section2">
          <div className="intro-chat">
            <img src="/img/tts.svg" alt="" />
            <h2>Generate Text to Speech</h2>
          </div>

          <div className="chat-box chat-box1">
            <div className="chatinput chatinput3">
              <textarea 
                placeholder="Enter the text you'd like to convert to speech..." 
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    generateSpeech();
                  }
                }}
              />

              <div className="input-actions">
                <div className="left">
                  <div className="selection cursor-pointer">
                    <img src="/img/att.svg" alt="" />
                    <p>Attach</p>
                  </div>
                  <div className="selection cursor-pointer">
                    <img src="/img/set.svg" alt="" />
                    <p>Settings</p>
                  </div>
                  <div className="selection cursor-pointer">
                    <img src="/img/opt.svg" alt="" />
                    <p>Options</p>
                  </div>
                </div>
                <div className="right">
                  <div className="mic-btn">
                    <img src="/img/mic.svg" alt="" />
                  </div>
                  <div className="generate-btn" onClick={generateSpeech}>
                    <p>Generate</p>
                    <img src="/img/generate.svg" alt="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <style jsx>{`
        .tts-page-container {
          display: flex;
          min-height: 100vh;
          background: #000;
        }

        .tts-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        
        .chat-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: space-between;
          padding-top: 2rem;
          padding-bottom: 2rem;
        }

        .intro-chat {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 1rem;
        }

        .intro-chat img {
          width: 80px;
          height: auto;
          opacity: 0.8;
        }

        .intro-chat h2 {
          font-family: motive-reg;
          color: #fff;
          font-size: 1.5rem;
          margin: 0;
        }



        /* Tablet (max-width: 960px) */
        @media (max-width: 960px) {
          .chat-box {
            width: 90%;
          }
          
          .chatinput3 {
            width: 90%;
          }
        }

        /* Small Mobile (max-width: 480px) */
        @media (max-width: 480px) {
          .chat-box {
            width: 95%;
          }
          
          .chatinput3 {
            width: 95%;
            bottom: 1rem;
            height: auto;
            min-height: 160px;
          }
          
          .intro-chat {
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          
          .intro-chat img {
            width: 50px;
          }
          
          .intro-chat h2 {
            font-size: 1.2rem;
          }
          
          .mod-btn {
            padding: 0.4rem 1rem;
            width: 100%;
          }
          
          .adjust-level p {
            font-size: 11px;
          }
          
          .input-actions {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            height: 3rem;
            padding-bottom: 0.5rem;
          }
          
          .input-actions .left, .input-actions .right {
            width: auto;
            gap: 0.5rem;
          }
          
          .input-actions .right {
            justify-content: flex-end;
          }

          .generate-btn {
            padding: 0.4rem 0.8rem;
          }
          
          .generate-btn p {
            font-size: 11px;
          }
          
          .generate-btn img {
            width: 0.7rem;
          }
        }

        .mobile-menu-btn {
          display: none;
          cursor: pointer;
        }

        .side-menu {
          position: fixed;
          top: 0;
          right: -100%;
          width: 70%;
          height: 100vh;
          background-color: #000;
          z-index: 2000;
          transition: right 0.3s ease;
          border-left: 1px solid #32A2F2;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .side-menu.open {
          right: 0;
        }

        .side-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          z-index: 1999;
          animation: fadeIn 0.2s ease-in-out;
        }

        .menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .menu-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }

        /* Mobile Menu Media Query */
        @media (max-width: 780px) {
          .desktop-only {
            display: none !important;
          }

          .mobile-menu-btn {
            display: block;
          }
          
          .chat-top {
            justify-content: flex-end;
          }
        }
      `}</style>
      </div>
    </>
  );
}