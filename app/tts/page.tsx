'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function TextToSpeechPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: session } = useSession();
  const { isListening, transcript, toggle } = useSpeechToText();

  useEffect(() => {
    if (transcript) {
      setText((prev) => {
        const base = prev.trim();
        return base ? `${base} ${transcript}` : transcript;
      });
    }
  }, [transcript]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGuestRedirect = (feature: string) => {
    toast.error(`Sign in to use ${feature}!`);
    router.push('/register');
  };

  const generateSpeech = () => {
    if (session?.user?.type === 'guest') {
      handleGuestRedirect('AI Text-to-Speech');
      return;
    }
    if (!text.trim() || isGenerating) {
      setError('Please enter text');
      return;
    }
    setIsGenerating(true);
    // Store text in sessionStorage for the generate page to pick up
    sessionStorage.setItem('ryvon_tts_text', text);
    setTimeout(() => {
      router.push('/tts/generate');
    }, 500); // Short delay to show the generating state
  };

  if (!mounted) return null;

  return (
    <>
      <div className="tts-page-container">
      <div className="tts-main-content chat">
        <div className='chat-top flex justify-between items-center w-full'>
          <div className="flex items-center gap-2">
            <SidebarToggle className="text-white" />
          </div>
          
          <div className="flex items-center gap-2">
             <div className="btn2 btn premium-btn"><p>RyvonAI v1.0</p></div>
          </div>
        </div>

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
                  <div className="selection cursor-pointer" onClick={() => handleGuestRedirect('file attachments')}>
                    <img src="/img/att.svg" alt="" />
                    <p>Attach</p>
                  </div>
                  <div className="selection cursor-pointer" onClick={() => handleGuestRedirect('settings')}>
                    <img src="/img/set.svg" alt="" />
                    <p>Settings</p>
                  </div>
                </div>
                <div className="right">
                  <div 
                    className={cn(
                      "mic-btn cursor-pointer rounded-full p-1.5 transition-all flex items-center justify-center",
                      isListening && "bg-blue-500/10 animate-[pulse-blue_2s_infinite]"
                    )}
                    onClick={() => {
                      if (session?.user?.type === 'guest') {
                        handleGuestRedirect('voice input');
                        return;
                      }
                      toggle();
                    }}
                    title={isListening ? "Stop Recording" : "Start Voice Input"}
                  >
                    <img 
                      src="/img/mic.svg" 
                      alt="" 
                      className={cn("w-5 h-5", isListening && "brightness-150")} 
                    />
                  </div>
                  <div className="generate-btn cursor-pointer wander-shake" onClick={generateSpeech}>
                    <p>{isGenerating ? 'Generating...' : 'Generate'}</p>
                    <img src={isGenerating ? "/images/loading-spinner.svg" : "/img/generate.svg"} alt="" className={isGenerating ? "animate-[wand-shake_0.4s_ease-in-out_infinite] w-4 h-4" : ""} />
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
          height: 100dvh;
          overflow: hidden;
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

        /* Mobile Menu Media Query */
        @media (max-width: 780px) {
          .chat-top {
            padding: 0 1rem;
          }
        }
      `}</style>
      </div>
    </>
  );
}