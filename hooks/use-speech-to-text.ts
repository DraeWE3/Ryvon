"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser. Please try Chrome or Edge.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("[SPEECH] Recognition started");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("[SPEECH] error:", event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error("Microphone access denied. Please enable it in browser settings.");
      } else if (event.error === 'network') {
        toast.error("Network error during speech recognition.");
      }
    };

    recognition.onend = () => {
      console.log("[SPEECH] Recognition ended");
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, []);

  const start = useCallback(() => {
    const recognition = initRecognition();
    if (recognition && !isListening) {
      setTranscript("");
      try {
        recognition.start();
      } catch (err) {
        console.error("[SPEECH] Failed to start:", err);
      }
    }
  }, [isListening, initRecognition]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggle = useCallback(() => {
    console.log("[SPEECH] Toggling... current state:", isListening);
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return { isListening, transcript, toggle, start, stop };
}

