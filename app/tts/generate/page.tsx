'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import bgMod from '../../../artifacts/image/bg-mod.png';
import voicePfp from '../../../artifacts/image/voice-pfp.svg';
import dDown from '../../../artifacts/image/ddown.svg';
import dTip from '../../../artifacts/image/d-tip.svg';
import resetImg from '../../../artifacts/image/reset.svg';
import backIcon from '../../../artifacts/image/back.svg';
import forwardIcon from '../../../artifacts/image/forward.svg';
import callImg from '../../../artifacts/image/call.webp';
import playBtnBg from '../../../artifacts/image/play-btn-bg.png';
import downloadBg from '../../../artifacts/image/download-bg.png';
import downloadIcon from '../../../artifacts/image/download-icon.svg';
import { Play, Pause, ArrowLeft, Menu, X } from 'lucide-react';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { toast } from 'sonner';

export default function TTSGeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMyVoicesModal, setShowMyVoicesModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');

  // Audio visualization states
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Voice settings
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [styleExaggeration, setStyleExaggeration] = useState(0.5);
  const [languageOverride, setLanguageOverride] = useState(false);
  const [speakerBoost, setSpeakerBoost] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';

  useEffect(() => {
    setMounted(true);
    // Retrieve text from sessionStorage (set by the main TTS page)
    const storedText = sessionStorage.getItem('ryvon_tts_text');
    if (storedText) {
      setText(storedText);
    }

    if (!apiKey) {
      setError('API key not found');
      return;
    }
    fetchVoices(apiKey);
  }, []);

  // Auto-generate on first voice load
  useEffect(() => {
    if (voices.length > 0 && selectedVoiceId && text && !audioUrl) {
      generateSpeech(selectedVoiceId);
    }
  }, [voices, selectedVoiceId]);

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
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error('Failed to fetch voices');
      }
      const data = await response.json();
      setVoices(data.voices || []);
      if (data.voices?.length > 0) setSelectedVoiceId(data.voices[0].voice_id);
    } catch (err: any) {
      console.error('Fetch voices error:', err);
      setError(`Failed to load voices: ${err.message}`);
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
      <div className="tts-generate-page">
        <div className="tts-generate-content chat">
          {/* Top Bar */}
          <div className='chat-top flex justify-between items-center w-full'>
            <div className="flex items-center gap-2">
              <div 
                className="btn2 btn border border-white/10 bg-white/5 backdrop-blur-md rounded-full px-4 py-2 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => router.push('/tts')}
              >
                <ArrowLeft size={16} color="white" />
                <p className="whitespace-nowrap font-medium">Back to TTS</p>
              </div>
              <SidebarToggle className="text-white" />
              <div className="btn2 btn desktop-only premium-btn"><p>RyvonAI v1.0</p></div>
            </div>

            <div className="flex items-center gap-2 mobile-only">
              <div className="btn2 btn premium-btn"><p>RyvonAI v1.0</p></div>
            </div>
          </div>

          {/* My Voices Coming Soon Modal */}
          {showMyVoicesModal && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowMyVoicesModal(false)}>
              <div 
                className="relative flex flex-col items-center text-center rounded-[2rem] p-8 max-w-sm w-[90%] border border-white/10 shadow-[0_0_50px_rgba(0,111,191,0.2)]"
                style={{ background: 'linear-gradient(to bottom, rgba(0, 111, 191, 0.6), rgba(2, 6, 24, 0.52))' }}
                onClick={e => e.stopPropagation()}
              >
                <img src="/images/voice-cs.svg" alt="Coming Soon" className="w-16 h-16 mb-6" />
                <h2 className="text-xl font-medium text-white mb-4" style={{ fontFamily: 'motive-reg' }}>Voice Feature Coming Soon</h2>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                  We're working on bringing advanced voice capabilities to Ryon.<br/><br/>
                  Enable real-world interactions powered by AI.
                </p>
                <div className="flex gap-4 w-full">
                  <button className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 text-white font-medium hover:bg-white/10 transition-colors" 
                    onClick={() => {
                      setShowMyVoicesModal(false);
                      toast.success("Notification enabled! We'll alert you as soon as this feature goes live.");
                    }}>
                    Notify Me
                  </button>
                  <button className="flex-1 py-3 px-4 rounded-xl bg-[#090C15] border border-white/5 text-white font-medium hover:bg-white/5 transition-colors" onClick={() => setShowMyVoicesModal(false)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content — the former modal, now as inline layout */}
          <div className="generate-content-area">
            <div className="modal-container">
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
                    <div className="absolute top-full left-0 w-full max-h-[250px] overflow-y-auto bg-black/90 border border-[#32A2F2]/50 backdrop-blur-xl rounded-xl shadow-[0_0_15px_rgba(50,162,242,0.3)] z-[100] mt-2 scrollbar-hide" onClick={(e) => e.stopPropagation()}>
                      {voices.map((voice) => (
                        <div
                          key={voice.voice_id}
                          onClick={() => {
                            setSelectedVoiceId(voice.voice_id);
                            setShowVoiceDropdown(false);
                            generateSpeech(voice.voice_id);
                          }}
                          className="hover:bg-white/10 transition-colors flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-white/5"
                        >
                           <span className="text-white text-[0.85rem]" style={{fontFamily: 'motive-reg'}}>{voice.name}</span>
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
                      <input type="range" min="0" max="1" step="0.01" value={playbackSpeed}
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
                      <input type="range" min="0" max="1" step="0.01" value={stability}
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
                      <input type="range" min="0" max="1" step="0.01" value={similarity}
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
                      <input type="range" min="0" max="1" step="0.01" value={styleExaggeration}
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
                    <input type="checkbox" checked={languageOverride} onChange={(e) => setLanguageOverride(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="mod-toggle">
                  <p>Speaker boost</p>
                  <label className="toggle">
                    <input type="checkbox" checked={speakerBoost} onChange={(e) => setSpeakerBoost(e.target.checked)} />
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

                <div className="mode-right-bottom" style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', gap: '1rem' }}>
                  <div className="voice-download hover:scale-[1.02] transition-transform" onClick={() => {
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

                  <div className="voice-download hover:scale-[1.02] transition-transform cursor-pointer border border-white/10" 
                       onClick={() => setShowMyVoicesModal(true)}>
                    <div className="download-icon" style={{ backgroundImage: `url('${downloadBg.src}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <img className="download-icon-img" src="/images/my-voice.svg" alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                    </div>
                    <p>My Voices</p>
                  </div>
                </div>

                {/* Generating indicator */}
                {isGenerating && (
                  <div style={{ color: '#2388FF', fontFamily: 'motive-reg', fontSize: '14px', marginTop: '1rem', textAlign: 'center' }}>
                    Generating speech...
                  </div>
                )}
                {error && (
                  <div style={{ color: '#ff4444', fontFamily: 'motive-reg', fontSize: '14px', marginTop: '0.5rem', textAlign: 'center' }}>
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      <style jsx>{`
        .tts-generate-page {
          display: flex;
          min-height: 100dvh;
          background-image: url('${bgMod.src}');
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
        }

        .tts-generate-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .generate-content-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .modal-container {
          width: 95%;
          max-width: 1600px;
          min-height: 600px;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          justify-content: center;
          gap: 2.5rem;
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
          flex: none;
          width: 35vw;
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
          flex: none;
          width: 35vw;
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

        .selected-voice {
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

        .mod-toggle1 {
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

        /* Tablet */
        @media (max-width: 960px) {
          .modal-container {
            width: 95%;
          }
        }

        /* Mobile */
        @media (max-width: 780px) {
          .generate-content-area {
            align-items: flex-start;
            padding: 1rem;
          }

          .modal-container {
            flex-direction: column;
            margin: 1rem auto 2rem;
            width: 95%;
            max-width: 600px;
            gap: 1.5rem;
            max-height: none;
          }

          .mod-left, .mod-right {
            width: 100%;
            min-height: 400px;
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

        .mobile-menu-btn {
          display: none;
          cursor: pointer;
        }

        .side-menu {
          position: fixed;
          top: 0;
          right: -100%;
          width: 70%;
          height: 100dvh;
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

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 780px) {
          .mobile-menu-btn {
            display: block;
          }
        }

        @media (max-width: 1024px) {
          .modal-container {
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            width: 95%;
          }
          .mod-left, .mod-right {
            width: 100%;
            max-width: 100%;
          }
        }
      `}</style>
      </div>
    </>
  );
}
