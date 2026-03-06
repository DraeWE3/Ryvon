'use client';

import React, { useState, useEffect, useRef } from 'react';
import bgMod from '../../artifacts/image/bg-mod.png';
import voicePfp from '../../artifacts/image/voice-pfp.svg';
import dDown from '../../artifacts/image/ddown.svg';
import dTip from '../../artifacts/image/d-tip.svg';
import resetImg from '../../artifacts/image/reset.svg';
import backIcon from '../../artifacts/image/back.svg';
import playIcon from '../../artifacts/image/play-icon.svg';
import forwardIcon from '../../artifacts/image/forward.svg';
import callImg from '../../artifacts/image/call.webp';
import playBtnBg from '../../artifacts/image/play-btn-bg.png';
import downloadBg from '../../artifacts/image/download-bg.png';
import downloadIcon from '../../artifacts/image/download-icon.svg';
import { Play, Pause, Menu, X } from 'lucide-react';
import { SidebarToggle } from '@/components/sidebar-toggle';

export default function TextToSpeechPage() {
  const [mounted, setMounted] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Audio visualization states
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Voice settings
  const [playbackSpeed, setPlaybackSpeed] = useState(0.5);
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [styleExaggeration, setStyleExaggeration] = useState(0.5);
  const [languageOverride, setLanguageOverride] = useState(false);
  const [speakerBoost, setSpeakerBoost] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';

  useEffect(() => {
    setMounted(true);
    if (!apiKey) {
      setError('API key not found');
      return;
    }
    fetchVoices(apiKey);
  }, []);

  useEffect(() => {
    if (audio) {
      audio.onended = () => {
        setIsPlaying(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setError('Error playing audio');
      };
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.playbackRate = playbackSpeed;
    }
  }, [audio, playbackSpeed]);

  const fetchVoices = async (key: string) => {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': key }
      });
      if (!response.ok) throw new Error('Failed to fetch voices');
      const data = await response.json();
      setVoices(data.voices || []);
      if (data.voices?.length > 0) setSelectedVoiceId(data.voices[0].voice_id);
    } catch (err) {
      setError('Failed to load voices');
    }
  };

  const setupAudioVisualization = (audioElement: HTMLAudioElement) => {
    if (!canvasRef.current) return;
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyser.fftSize = 256;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      drawWaveform();
    } catch (e) {
      console.error("Audio Context Error:", e);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = 3;
      const gap = 2;
      const totalBars = Math.floor(canvas.width / (barWidth + gap));
      
      for (let i = 0; i < totalBars; i++) {
        const dataIndex = Math.floor((i / totalBars) * bufferLength);
        const value = dataArray[dataIndex] || 0;
        const barHeight = (value / 255) * (canvas.height * 0.8);
        const x = i * (barWidth + gap);
        const y = (canvas.height - barHeight) / 2;
        ctx.fillStyle = '#2388FF';
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };
    draw();
  };

  const generateSpeech = async (overrideVoiceId?: any) => {
    const voiceId = typeof overrideVoiceId === 'string' ? overrideVoiceId : selectedVoiceId;
    
    if (!text.trim()) {
      setError('Please enter text');
      return;
    }
    if (!voiceId) {
      setError('Please select a voice');
      return;
    }

    setShowModal(true);
    setIsGenerating(true);
    setError('');

    if (!apiKey) {
      setError('API key not set');
      setIsGenerating(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: stability,
              similarity_boost: similarity,
              style: styleExaggeration,
              use_speaker_boost: speakerBoost
            }
          })
        }
      );

      if (!response.ok) throw new Error('Failed to generate speech');

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      
      if (audio) {
        audio.pause();
      }

      setAudioUrl(url);
      const newAudio = new Audio(url);
      newAudio.playbackRate = playbackSpeed;
      
      newAudio.addEventListener('timeupdate', () => setCurrentTime(newAudio.currentTime));
      newAudio.addEventListener('loadedmetadata', () => setDuration(newAudio.duration));
      newAudio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      setAudio(newAudio);
      
      newAudio.addEventListener('canplay', () => {
        setupAudioVisualization(newAudio);
      }, { once: true });
      
      newAudio.play();
      setIsPlaying(true);
    } catch (err) {
      setError('Failed to generate speech');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayPause = () => {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    } else {
      audio.play();
      setIsPlaying(true);
      drawWaveform();
    }
  };

  const skipBackward = () => {
    if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const skipForward = () => {
    if (audio) audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const resetValues = () => {
    setPlaybackSpeed(0.5);
    setStability(0.5);
    setSimilarity(0.75);
    setStyleExaggeration(0.5);
    setLanguageOverride(false);
    setSpeakerBoost(false);
  };

  if (!mounted) return null;

  const selectedVoice = voices.find(v => v.voice_id === selectedVoiceId);

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
                  <div className="generate-btn" onClick={() => generateSpeech()}>
                    <p>{isGenerating ? 'Generating...' : 'Generate'}</p>
                    <img src="/img/generate.svg" alt="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal with Custom Design */}
      {showModal && (
        <div 
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
            <div className="modal-close-outer" onClick={() => setShowModal(false)}>
              <X size={28} color="white" />
            </div>
            
            <div 
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Left Panel */}
            <div className="mod-left gradient-border">
              <div className="selectvoice" style={{position: 'relative', cursor: 'pointer', zIndex: 50}} onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}>
                <img className="voice-pfp" src={voicePfp.src} alt="" />
                <div className="selected-voice">
                  <h1>{selectedVoice?.name || 'Select Voice'}</h1>
                  <p>{selectedVoice?.labels?.description || selectedVoice?.labels?.accent || 'Voice description'}</p>
                </div>
                <img className="drop-down" src={dDown.src} alt="" style={{ transform: showVoiceDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                
                {showVoiceDropdown && (
                  <div className="voice-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    backgroundColor: '#1E2124',
                    border: '1px solid #32A2F2',
                    borderRadius: '0.5rem',
                    zIndex: 100,
                    marginTop: '0.5rem'
                  }} onClick={(e) => e.stopPropagation()}>
                    {voices.map((voice) => (
                      <div 
                        key={voice.voice_id} 
                        onClick={() => {
                          setSelectedVoiceId(voice.voice_id);
                          setShowVoiceDropdown(false);
                          generateSpeech(voice.voice_id);
                        }}
                        style={{
                          padding: '0.75rem',
                          color: '#fff',
                          cursor: 'pointer',
                          borderBottom: '1px solid #ffffff20',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                         <span>{voice.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="adjust-container">
                {/* Speed Slider */}
                <div className="adjust">
                  <div className="text-adjust">
                    <h2 className="adjust-title">Speed</h2>
                    <div className="adjust-level">
                      <p>Slower</p>
                      <p>Faster</p>
                    </div>
                  </div>
                  <div className="manual-adjust" style={{ position: 'relative' }}>
                    <div className="draggable" style={{ width: `${playbackSpeed * 100}%`, height: '100%', position: 'absolute', top: 0, left: 0 }}>
                      <img className="d-tip" src={dTip.src} alt="" style={{ position: 'absolute', right: '-0.5rem', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                    />
                  </div>
                </div>

                {/* Stability Slider */}
                <div className="adjust">
                  <div className="text-adjust">
                    <h2 className="adjust-title">Stability</h2>
                    <div className="adjust-level">
                      <p>More variable</p>
                      <p>More stable</p>
                    </div>
                  </div>
                  <div className="manual-adjust" style={{ position: 'relative' }}>
                    <div className="draggable" style={{ width: `${stability * 100}%`, height: '100%', position: 'absolute', top: 0, left: 0 }}>
                      <img className="d-tip" src={dTip.src} alt="" style={{ position: 'absolute', right: '-0.5rem', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={stability}
                      onChange={(e) => setStability(parseFloat(e.target.value))}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                    />
                  </div>
                </div>

                {/* Similarity Slider */}
                <div className="adjust">
                  <div className="text-adjust">
                    <h2 className="adjust-title">Similarity</h2>
                    <div className="adjust-level">
                      <p>Low</p>
                      <p>High</p>
                    </div>
                  </div>
                  <div className="manual-adjust" style={{ position: 'relative' }}>
                    <div className="draggable" style={{ width: `${similarity * 100}%`, height: '100%', position: 'absolute', top: 0, left: 0 }}>
                      <img className="d-tip" src={dTip.src} alt="" style={{ position: 'absolute', right: '-0.5rem', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={similarity}
                      onChange={(e) => setSimilarity(parseFloat(e.target.value))}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                    />
                  </div>
                </div>

                {/* Style Exaggeration Slider */}
                <div className="adjust">
                  <div className="text-adjust">
                    <h2 className="adjust-title">Style Exaggeration</h2>
                    <div className="adjust-level">
                      <p>None</p>
                      <p>Exaggeration</p>
                    </div>
                  </div>
                  <div className="manual-adjust" style={{ position: 'relative' }}>
                    <div className="draggable" style={{ width: `${styleExaggeration * 100}%`, height: '100%', position: 'absolute', top: 0, left: 0 }}>
                      <img className="d-tip" src={dTip.src} alt="" style={{ position: 'absolute', right: '-0.5rem', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={styleExaggeration}
                      onChange={(e) => setStyleExaggeration(parseFloat(e.target.value))}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="mod-toggle mod-toggle1">
                <p>Language Override</p>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={languageOverride}
                    onChange={(e) => setLanguageOverride(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="mod-toggle">
                <p>Speaker boost</p>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={speakerBoost}
                    onChange={(e) => setSpeakerBoost(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="btn-middle">
                <div className="mod-btn" onClick={resetValues}>
                  <p>Reset Values</p>
                  <img src={resetImg.src} alt="" />
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="mod-right">
              <div className="play-con">
                <div className="play">
                  <div className="play-top">
                    <img className="voice-pfp" src={voicePfp.src} alt="" />
                    <div className="selected-voice">
                      <h1>{selectedVoice?.name || 'Voice'}</h1>
                      <p>{selectedVoice?.labels?.description || selectedVoice?.labels?.accent || 'Voice description'}</p>
                    </div>
                  </div>
                  
                  <div className="play-controller">
                    <div className="pase-play">
                      <img className="backward" src={backIcon.src} alt="" onClick={skipBackward} />
                      <div className="play-btn" onClick={togglePlayPause} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isPlaying ? <Pause color="white" fill="white" size={24} /> : <Play color="white" fill="white" size={24} style={{ marginLeft: '4px' }} />}
                      </div>
                      <img className="forward" src={forwardIcon.src} alt="" onClick={skipForward} />
                    </div>

                    <div className="play-length-con">
                      <p>{formatTime(currentTime)}</p>
                      <div className="play-length">
                        <div className="length-indicator" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}></div>
                      </div>
                      <p>{formatTime(duration)}</p>
                    </div>

                    <div className="wavelength">
                      <canvas 
                        ref={canvasRef} 
                        width={400} 
                        height={25}
                        style={{ width: '95%', height: '90%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mode-right-bottom">
                <div className="voice-download" onClick={() => {
                  if (audioUrl) {
                    const a = document.createElement('a');
                    a.href = audioUrl;
                    a.download = 'speech.mp3';
                    a.click();
                  }
                }}>
                  <div className="download-icon">
                    <img className="download-icon-img" src={downloadIcon.src} alt="" />
                  </div>
                  <p>Download</p>
                </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

        /* FIXED Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          background-image: url('${bgMod.src}');
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 2rem;
          overflow-y: auto;
          animation: fadeIn 0.2s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-close-outer {
          position: fixed;
          top: 2rem;
          right: 2rem;
          cursor: pointer;
          background: rgba(0,0,0,0.3);
          padding: 0.5rem;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.1);
          z-index: 2001;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .modal-close-outer:hover {
          background: rgba(255,255,255,0.1);
        }

        .modal-container {
          width: 90%;
          max-width: 1400px;
          max-height: 85vh;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          justify-content: center;
          gap: 2rem;
          position: relative;
        }

        .gradient-border {
          position: relative;
          padding: 1px;
          background:
            linear-gradient(to right, #32A2F2, #000, #32A2F2) top,
            linear-gradient(to right, #32A2F2, #000, #32A2F2) bottom,
            linear-gradient(to bottom, #32A2F2, #000, #32A2F2) left,
            linear-gradient(to bottom, #32A2F2, #000, #32A2F2) right;
          background-size:
            100% 1px,
            100% 1px,
            1px 100%,
            1px 100%;
          background-repeat: no-repeat;
          background-position:
            top,
            bottom,
            left,
            right;
        }

        .mod-left {
          flex: 1;
          min-width: 0;
          border-radius: 1rem;
          border: 1px solid #32A2F2;
          display: flex;
          align-items: center;
          justify-content: start;
          flex-direction: column;
          padding: 1.3rem 0.1rem;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: #00000074;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .mod-left::-webkit-scrollbar {
          display: none;
        }

        .mod-right {
          flex: 1;
          min-width: 0;
          border-radius: 1rem;
          border: 1px solid #32A2F2;
          display: flex;
          align-items: center;
          justify-content: start;
          flex-direction: column;
          padding: 1.3rem 0.1rem;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: #00000074;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .mod-right::-webkit-scrollbar {
          display: none;
        }

        .selectvoice {
          display: flex;
          width: 90%;
          border-radius: 5rem;
          border: 1px solid #ffffff69;
          align-items: center;
          justify-content: start;
          padding: 0.25rem 0.5rem;
        }

        .voice-pfp {
          width: 2rem;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .selected-voice{
          flex: 1;
          min-width: 0;
        }

        .selected-voice h1 {
          font-size: 0.8rem;
          color: #fff;
          font-family: motive-reg;
          margin: 0;
        }

        .selected-voice p {
          font-size: 0.7rem;
          color: #747272;
          font-family: motive-reg;
          margin: 0;
        }

        .drop-down {
          width: 1.5rem;
          flex-shrink: 0;
        }

        .adjust {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          width: 90%;
          margin-bottom: 0.4rem;
        }

        .text-adjust {
          width: 100%;
        }

        .adjust-level {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .adjust-title {
          font-family: motive-reg;
          color: #fff;
          font-size: 14px;
          margin: 0;
        }

        .adjust-level p {
          font-family: motive-light;
          color: #747272;
          font-size: 13px;
          margin-bottom: 5px;
        }

        .manual-adjust {
          width: 100%;
          height: 0.3rem;
          background-color: #fff;
          border-radius: 5rem;
          position: relative;
        }

        .draggable {
          height: 100%;
          background-image: linear-gradient(to right, #001633, #2388FF);
          position: relative;
          border-radius: 5rem;
        }

        .d-tip {
          position: absolute;
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          right: -5%;
          bottom: -105%;
          background-color: #0080FF;
          cursor: pointer;
        }

        .adjust-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-top: 1.5rem;
          margin-bottom: 1.3rem;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 42px;
          height: 20px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-image: linear-gradient(to bottom, #282B30, #1E2124);
          border-radius: 20px;
          transition: background 0.25s ease;
        }

        .slider::before {
          content: "";
          position: absolute;
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-image: linear-gradient(to bottom, #484E56, #3B4048);
          border-radius: 50%;
          border: 1px solid #0000009a;
          transition: transform 0.25s ease;
        }

        .toggle input:checked + .slider {
          background: #2388FF;
        }

        .toggle input:checked + .slider::before {
          transform: translateX(22px);
        }

        .mod-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 90%;
          font-family: motive-reg;
          color: #fff;
          font-size: 15px;
        }

        .mod-toggle1{
          margin-bottom: 2rem;
        }

        .mod-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid #ffffff37;
          background: #0000002d;
          border-radius: 5rem;
          padding: 0.4rem 1.5rem;
          box-shadow: inset 0 6px 8px rgba(0, 0, 0, 0.45);
          cursor: pointer;
        }

        .mod-btn p {
          margin: 0;
          font-family: motive-light;
          color: #fff;
          font-size: 12px;
        }

        .mod-btn img {
          width: 0.9rem;
        }

        .btn-middle {
          margin-top: 1rem;
        }

        .play-con {
          border-top: 1px solid #0080FF;
          border-bottom: 1px solid #000000;
          background-image: 
            linear-gradient(#0080ff63, #000000),
            linear-gradient(#0080ff37, #000000);
          background-size: 1px 100%;
          background-position: 0 0, 100% 0;
          background-repeat: no-repeat;
          width: 94%;
          height: fit-content;
          border-radius: 0.8rem;
        }

        .play-con .play {
          background-image: url('${callImg.src}');
          width: 100%;
          height: 100%;
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
          border-radius: 0.8rem;
          padding: 3%;
          padding-bottom: 1% !important;
        }

        .play-top {
          display: flex;
          align-items: center;
          justify-content: start;
          gap: 0.8rem;
        }

        .play-top p {
          color: #ACF9FF;
        }

        .play-controller {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          margin-top: 1rem;
        }

        .pase-play {
          width: 8rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .backward, .forward {
          width: 1.4rem;
          cursor: pointer;
        }

        .play-btn {
          background-image: url('${playBtnBg.src}');
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
          height: 3.5rem;
          width: 3.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .play-btn img {
          width: 45%;
        }

        .play-length-con {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .play-length {
          width: 85%;
          height: 0.3rem;
          background-color: #fff;
          border-radius: 5rem;
        }

        .length-indicator {
          height: 100%;
          background-image: linear-gradient(to right, #001633, #2388FF);
          border-radius: 5rem;
        }

        .play-length-con p {
          font-family: motive-reg;
          color: #fff;
          font-size: 10px;
        }

        .wavelength {
          width: 100%;
          height: 2rem;
          border: 1px solid #ffffff37;
          background: #0000002d;
          border-radius: 5rem;
          box-shadow: inset 0 6px 8px rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1rem;
        }

        .mode-right-bottom {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .voice-download {
          width: 12rem;
          height: 8rem;
          background-color: #3071e134;
          border-radius: 0.6rem;
          border: 1px solid #ffffff28;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          box-shadow:
            inset 0 6px 35px rgba(0, 0, 0, 0.333),
            0 8px 16px rgba(0, 0, 0, 0.35);
          gap: 5px;
          cursor: pointer;
        }

        .download-icon {
          background-image: url('${downloadBg.src}');
          width: 3.5rem;
          height: 3.5rem;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .download-icon-img {
          width: 50%;
          height: auto;
        }

        .voice-download p {
          margin: 0;
          color: #fff;
          font-family: motive-reg;
          font-size: 14px;
        }

        /* Tablet (max-width: 960px) */
        @media (max-width: 960px) {
          .modal-container {
            width: 95%;
          }
          
          .chat-box {
            width: 90%;
          }
          
          .chatinput3 {
            width: 90%;
          }
        }

        /* Mobile (max-width: 780px) */
        @media (max-width: 780px) {
          .modal-overlay {
            align-items: flex-start;
            padding: 1rem;
          }
          
          .modal-container {
            flex-direction: column;
            margin: 4rem auto 2rem;
            width: 95%;
            max-width: 600px;
            gap: 1.5rem;
          }
          
          .mod-left, .mod-right {
            width: 100%;
            min-height: 400px;
          }
          
          .modal-close-outer {
            top: 1rem;
            right: 1rem;
          }
          
          .mode-right-bottom {
            padding: 2rem 0;
          }
          
          .voice-download {
            width: fit-content;
            min-width: 12rem;
            padding: 0 2rem;
            height: 6rem;
            flex-direction: row;
            gap: 1rem;
          }
          
          .download-icon {
            width: 3rem;
            height: 3rem;
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