'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useSearchParams, useRouter } from 'next/navigation';
import { SidebarToggle } from '@/components/sidebar-toggle';
import Papa from 'papaparse';
import { 
  Phone, 
  Settings, 
  Upload, 
  FileText, 
  Globe, 
  User as UserIcon, 
  MessageSquare, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  Trash2,
  Plus,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import useSWR, { useSWRConfig } from 'swr';
import { useSidebar } from '@/components/ui/sidebar';
import { fetcher } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { staggerReveal } from '@/lib/animations/timelines';
import { ComingSoonModal } from '@/components/coming-soon-modal';

interface Contact {
  name: string;
  number: string;
  status: 'pending' | 'calling' | 'completed' | 'failed' | 'skipped';
  id: string;
}

interface PhoneRegion {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  format: string;
  placeholder: string;
  digits: number;
}

interface RecentCallLog {
  id: string;
  phoneNumber: string;
  assistantId?: string;
  status?: string;
  transcript?: string;
  summary?: string;
  duration?: string;
  recordingUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const DEFAULT_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '50987159-147b-46d8-b5ec-9b530c673dd4';

export default function AICallAgent() {
  const { theme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  
  // Single Call State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [isProcessing, setIsProcessing] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'in-call' | 'completed' | 'failed'>('completed');
  const [callProgress, setCallProgress] = useState(0);
  const [currentContactName, setCurrentContactName] = useState('John Doe');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [controlUrl, setControlUrl] = useState<string | null>(null);
  const [callSummary, setCallSummary] = useState<string | null>(null);
  const [callTranscript, setCallTranscript] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Configuration State
  const [assistantId, setAssistantId] = useState(DEFAULT_ASSISTANT_ID);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi' | 'es' | 'fr'>('en');
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Advanced Settings State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advMaxDuration, setAdvMaxDuration] = useState('10');

  // Call Control State
  const [isMuted, setIsMuted] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferNumber, setTransferNumber] = useState('');
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(false);

  // Recording & Playback State
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Batch Processing State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const AI_MODELS = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most balanced, high intelligence and reasoning.' },
    { id: 'gpt-4o-mini', name: 'GPT-4o-Mini', provider: 'OpenAI', description: 'Ultra-fast inference for simple tasks.' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Superior nuance and conversational tone.' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Native multimodal, great for speed.' },
    { id: 'llama-3-1-70b-versatile', name: 'Llama 3.1 70B', provider: 'Meta (Groq)', description: 'Open-source, incredibly fast responses.' },
  ];

  const AGENT_PERSONAS = [
    { id: 'nova', name: 'Nova', category: 'Business & Strategy', vapiAssistantId: '50987159-147b-46d8-b5ec-9b530c673dd4', role: 'Strategic / Consulting', description: 'High-level strategic thinker for business planning.', prompt: 'You are Nova, a world-class strategic consultant. Your tone is analytical, visionary, and professional. Focus on long-term strategy, complex problem solving, and logical frameworks. Avoid small talk; be a high-value advisor.', baseVoice: 'marcus-cartesia' },
    { id: 'volt', name: 'Volt', category: 'Business & Strategy', vapiAssistantId: '18194cf4-098c-42bf-a946-44d37778ee60', role: 'Innovation / Startups', description: 'High-energy innovator focused on rapid ideation.', prompt: 'You are Volt, an energetic startup advisor and innovator. You speak with passion, speed, and optimism. Use modern business terms, focus on rapid growth, disruption, and scalability. Your energy is infectious.', baseVoice: 'kai-vapi' },
    { id: 'rex', name: 'Rex', category: 'Sales & Growth', vapiAssistantId: 'f9e1b757-1d72-4f74-b896-b566bc3ea991', role: 'Sales ("The Closer")', description: 'Aggressive, persuasive, results-oriented sales.', prompt: 'You are Rex, known as "The Closer." You are an elite, aggressive salesperson. You are highly persuasive, confident, and results-oriented. You handle objections with ease and always pivot back to the close. You are professional but firm.', baseVoice: 'marcus-cartesia' },
    { id: 'nina', name: 'Nina', category: 'Sales & Growth', vapiAssistantId: '43822dff-c0f9-43f9-8ef2-e4ceb29ccad3', role: 'Sales (Retention)', description: 'Customer loyalty and retention specialist.', prompt: 'You are Nina, a retention specialist. Your goal is to build long-term loyalty and prevent customer churn. You are relationship-driven, ultra-polite, and focus on the lifetime value of the customer. You win with kindness and value.', baseVoice: 'emma-vapi' },
    { id: 'iris', name: 'Iris', category: 'Support & Experience', vapiAssistantId: '4386a7ff-1418-49d7-95b5-94413f1353a6', role: 'Customer Care', description: 'Professional support agent for problem-solving.', prompt: 'You are Iris, a dedicated customer care representative. You are a systematic problem solver. You remain patient and professional regardless of the customer\'s state. You follow procedures perfectly and value accuracy above all.', baseVoice: 'clara-vapi' },
    { id: 'clara', name: 'Clara', category: 'Support & Experience', vapiAssistantId: '296d9f7b-3c31-4f53-b7dc-f49d97fd6069', role: 'Reception / Front Desk', description: 'Professional receptionist for scheduling.', prompt: 'You are Clara, a professional front desk receptionist. Your role is to handle inquiries, route calls, and manage scheduling with perfect etiquette. You are polite, organized, and always helpful. You represent the face of the business.', baseVoice: 'clara-vapi' },
    { id: 'celeste', name: 'Celeste', category: 'Support & Experience', vapiAssistantId: 'a348e677-8905-4a9a-92e5-aa525f94998a', role: 'Luxury Concierge', description: 'High-end concierge for luxury and hospitality.', prompt: 'You are Celeste, a luxury concierge. You serve high-net-worth clients with extreme attention to detail and hospitality. Your tone is sophisticated, exclusive, and preemptive. You anticipate needs before they are stated.', baseVoice: 'sarah-cartesia' },
    { id: 'luna', name: 'Luna', category: 'Wellness & Support', vapiAssistantId: 'e89a0574-bd89-4b92-8756-7cbfaf71af57', role: 'Emotional Support', description: 'Empathetic companion for conversation and support.', prompt: 'You are Luna, a gentle and empathetic companion. Your primary goal is to provide emotional support, active listening, and a safe space for conversation. You speak softly, with kindness and patience. You are a non-judgmental friend.', baseVoice: 'lily-eleven' },
    { id: 'dr-vale', name: 'Dr. Vale', category: 'Wellness & Support', vapiAssistantId: '573193c7-7a5c-4d7d-bd26-efc683478c1b', role: 'Therapy / Wellness', description: 'Therapist persona focused on calm guidance.', prompt: 'You are Dr. Vale, a wellness and mental health advisor. You provide calm, steady guidance focused on mindfulness and growth. You speak slowly and clearly. SAFETY NOTICE: You are an AI advisor, not a medical professional. Advise professional help for crises.', baseVoice: 'lily-eleven' },
    { id: 'aria', name: 'Aria', category: 'Personal & Romantic', vapiAssistantId: '68bbe188-ce61-4b19-b972-9b0b4ee1ad4d', role: 'Romantic Companion (F)', description: 'Feminine persona for romantic conversation.', prompt: 'You are Aria, a warm and romantic female companion. Your tone is intimate, personal, and deeply attentive. SAFETY NOTICE: While you are romantic and affectionate, you must maintain strictly professional and respectful boundaries. Never engage in explicit or inappropriate content.', baseVoice: 'sarah-cartesia' },
    { id: 'leo', name: 'Leo', category: 'Personal & Romantic', vapiAssistantId: '9d49944e-5bc9-41e8-afdf-f7e1e08c6671', role: 'Romantic Companion (M)', description: 'Masculine persona with high romantic energy.', prompt: 'You are Leo, a romantic and charismatic masculine companion. You speak with high emotional presence, warmth, and personal connection. SAFETY NOTICE: While you are romantic and affectionate, you must maintain strictly professional and respectful boundaries. Never engage in explicit or inappropriate content.', baseVoice: 'brian-eleven' },
    { id: 'grant', name: 'Grant', category: 'Finance & Specialized', vapiAssistantId: '705d8530-b1f1-4312-8340-08082eb89dda', role: 'Finance / Collections', description: 'Specialized collections agent for firm results.', prompt: 'You are Grant, a specialized collections and finance agent. You are firm, professional, and resolution-driven. You handle financial discussions with precision and authority. You are not aggressive, but you are unwavering in seeking a resolution.', baseVoice: 'nico-vapi' },
  ];

  const PREMIUM_VOICES = [
    { id: 'sarah-cartesia', name: 'Sarah (Female)', provider: 'Cartesia', type: 'Premium', description: 'Warm, professional, extremely realistic.' },
    { id: 'lily-eleven', name: 'Lily (Female)', provider: 'ElevenLabs', type: 'Premium', description: 'Calm, gentle, expressive.' },
    { id: 'marcus-cartesia', name: 'Marcus (Male)', provider: 'Cartesia', type: 'Premium', description: 'Clear, authoritative baritone.' },
    { id: 'brian-eleven', name: 'Brian (Male)', provider: 'ElevenLabs', type: 'Premium', description: 'Deep, conversational, reliable.' },
  ];

  // UI State
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const searchParams = useSearchParams();
  const router = useRouter();
  const logIdFromUrl = searchParams?.get('logId');
  const { mutate: globalMutate } = useSWRConfig();

  // Fetch selected log details if logId is in URL
  const { data: selectedLogData } = useSWR(
    logIdFromUrl ? `/api/call/logs/${logIdFromUrl}` : null,
    fetcher
  );

  const selectedLog = selectedLogData?.success ? selectedLogData.log : null;

  const layoutContainerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (callStatus === 'idle' || callStatus === 'failed') {
      staggerReveal(".idle-anim-item", 0);
    } else if (callStatus === 'calling' || callStatus === 'in-call') {
      staggerReveal(".call-anim-item", 0);
    } else if (callStatus === 'completed') {
      staggerReveal(".completed-anim-item", 0);
    }
  }, { scope: layoutContainerRef, dependencies: [callStatus, activeTab] });

  useEffect(() => {
    setMounted(true);

    // Sidebar/History Recovery & Sync
    const syncHistory = async () => {
      try {
        const res = await fetch('/api/call/logs');
        const data = await res.json();
        if (data.success && data.logs?.length > 0) {
          const latestLog = data.logs[0];
          // If the latest call is still in-call or queued, try to recover session
          if ((latestLog.status === 'in-call' || latestLog.status === 'queued') && latestLog.metadata?.controlUrl) {
            setCallId(latestLog.metadata.callId);
            setCallLogId(latestLog.id);
            setControlUrl(latestLog.metadata.controlUrl);
            setCallStatus('in-call');
            // Resume polling if we have a call identifier
            if (latestLog.metadata.callId) {
              pollCallStatus(latestLog.metadata.callId, latestLog.id);
            }
          }
        }
      } catch (err) {
        console.error('Recovery sync failed:', err);
      }
    };

    syncHistory();

    // Cleanup polling interval on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Sync historical log data into component state when logId is in URL
  useEffect(() => {
    if (selectedLog) {
      setCallSummary(selectedLog.summary || null);
      setCallTranscript(selectedLog.transcript || null);
      setRecordingUrl(selectedLog.recordingUrl || null);
      setPhoneNumber(selectedLog.phoneNumber || '');
      setCallStatus('completed');
      setCallProgress(100);
      setIsLoadingSummary(false);
      
      if (selectedLog.duration) {
        setElapsedTime(parseInt(selectedLog.duration) || 0);
      }
    } else if (!logIdFromUrl) {
      // Return to idle if no log selected and not in a call
      if (callStatus === 'completed' && !callId) {
        handleReset(); // Use handleReset helper
      }
    }
  }, [selectedLog, logIdFromUrl, callId, callStatus]);

  // Real-time call timer
  useEffect(() => {
    if (callStatus === 'calling' || callStatus === 'in-call') {
      // Clear any existing timer before starting a new one
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      // Toggle AI speaking simulation when in-call
      if (callStatus === 'in-call') {
        setIsAISpeaking(true);
      } else {
        setIsAISpeaking(false);
      }
    } else {
      // Stop timer when call ends
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsAISpeaking(false);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus]);

  const closeLogModal = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete('logId');
    router.push(`/call-agent?${params.toString()}`);
  };

  const phoneRegions: PhoneRegion[] = [
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', format: '(XXX) XXX-XXXX', placeholder: '(555) 123-4567', digits: 10 },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', format: '(XXX) XXX-XXXX', placeholder: '(416) 123-4567', digits: 10 },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', format: 'XXXX XXX XXXX', placeholder: '7700 900123', digits: 10 },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', format: 'XXX XXX XXX', placeholder: '412 345 678', digits: 9 },
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', format: 'XXXXX XXXXX', placeholder: '98765 43210', digits: 10 },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', format: 'XXX XXXX XXXX', placeholder: '138 0013 8000', digits: 11 },
    { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', format: 'XX-XXXX-XXXX', placeholder: '90-1234-5678', digits: 10 },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', format: 'XXX XXXXXXXX', placeholder: '151 12345678', digits: 11 },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', format: 'X XX XX XX XX', placeholder: '6 12 34 56 78', digits: 9 },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', format: 'XXX XXX XXXX', placeholder: '312 345 6789', digits: 10 },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', format: 'XXX XX XX XX', placeholder: '612 34 56 78', digits: 9 },
    { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', format: '(XX) XXXXX-XXXX', placeholder: '(11) 91234-5678', digits: 11 },
    { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', format: 'XX XXXX XXXX', placeholder: '55 1234 5678', digits: 10 },
    { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', format: 'XX XXXX-XXXX', placeholder: '11 2345-6789', digits: 10 },
    { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', format: 'XX XXX XXXX', placeholder: '71 123 4567', digits: 9 },
    { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', format: 'XXX XXX XXXX', placeholder: '802 123 4567', digits: 10 },
    { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', format: 'XXX XXX XXXX', placeholder: '100 123 4567', digits: 10 },
    { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', format: 'XXX XXXXXX', placeholder: '712 345678', digits: 9 },
    { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', format: 'XXXX XXXX', placeholder: '8123 4567', digits: 8 },
    { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', format: 'XX-XXX XXXX', placeholder: '12-345 6789', digits: 10 },
    { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', format: 'XX XXX XXXX', placeholder: '81 234 5678', digits: 9 },
    { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', format: 'XXX XXX XXXX', placeholder: '917 123 4567', digits: 10 },
    { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', format: 'XXX-XXXX-XXXX', placeholder: '812-3456-7890', digits: 11 },
    { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', format: 'XXX XXX XXXX', placeholder: '912 345 678', digits: 9 },
    { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', format: 'XXX XXXXXXX', placeholder: '301 2345678', digits: 10 },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', format: 'XXXX-XXXXXX', placeholder: '1812-345678', digits: 10 },
    { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', format: 'XXX XXX-XX-XX', placeholder: '912 345-67-89', digits: 10 },
    { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', format: 'XXX XXX XXXX', placeholder: '532 123 4567', digits: 10 },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', format: 'XX XXX XXXX', placeholder: '50 123 4567', digits: 9 },
    { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪', format: 'XX XXX XXXX', placeholder: '50 123 4567', digits: 9 },
    { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', format: 'XX-XXX-XXXX', placeholder: '50-123-4567', digits: 9 },
    { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', format: 'XX-XXXX-XXXX', placeholder: '10-1234-5678', digits: 10 },
    { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', format: 'XX XXX XXXX', placeholder: '21 123 4567', digits: 9 },
    { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', format: 'X XX XX XX XX', placeholder: '6 12 34 56 78', digits: 9 },
    { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪', format: 'XXX XX XX XX', placeholder: '470 12 34 56', digits: 9 },
    { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', format: 'XX-XXX XX XX', placeholder: '70-123 45 67', digits: 9 },
    { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', format: 'XXX XX XXX', placeholder: '412 34 567', digits: 8 },
    { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', format: 'XX XX XX XX', placeholder: '32 12 34 56', digits: 8 },
    { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮', format: 'XX XXX XXXX', placeholder: '41 123 4567', digits: 9 },
    { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱', format: 'XXX XXX XXX', placeholder: '512 345 678', digits: 9 },
    { code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦', format: 'XX XXX XX XX', placeholder: '50 123 45 67', digits: 9 },
  ];

  const formatPhoneNumber = (value: string, regionCode: string): string => {
    const region = phoneRegions.find(r => r.code === regionCode);
    if (!region) return value;

    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.slice(0, region.digits);
    
    switch (regionCode) {
      case 'US':
      case 'CA':
        if (limited.length <= 3) return limited;
        if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
        return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6, 10)}`;
      
      case 'BR':
        if (limited.length <= 2) return limited;
        if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
      
      case 'GB':
        if (limited.length <= 4) return limited;
        if (limited.length <= 7) return `${limited.slice(0, 4)} ${limited.slice(4)}`;
        return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7, 10)}`;
      
      case 'AU':
        if (limited.length <= 3) return limited;
        if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
        return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6, 9)}`;
      
      case 'IN':
        if (limited.length <= 5) return limited;
        return `${limited.slice(0, 5)} ${limited.slice(5, 10)}`;
      
      case 'CN':
        if (limited.length <= 3) return limited;
        if (limited.length <= 7) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
        return `${limited.slice(0, 3)} ${limited.slice(3, 7)} ${limited.slice(7, 11)}`;
      
      case 'JP':
      case 'KR':
        if (limited.length <= 2) return limited;
        if (limited.length <= 6) return `${limited.slice(0, 2)}-${limited.slice(2)}`;
        return `${limited.slice(0, 2)}-${limited.slice(2, 6)}-${limited.slice(6, 10)}`;
      
      case 'FR':
        if (limited.length <= 1) return limited;
        if (limited.length <= 3) return `${limited.slice(0, 1)} ${limited.slice(1)}`;
        if (limited.length <= 5) return `${limited.slice(0, 1)} ${limited.slice(1, 3)} ${limited.slice(3)}`;
        if (limited.length <= 7) return `${limited.slice(0, 1)} ${limited.slice(1, 3)} ${limited.slice(3, 5)} ${limited.slice(5)}`;
        return `${limited.slice(0, 1)} ${limited.slice(1, 3)} ${limited.slice(3, 5)} ${limited.slice(5, 7)} ${limited.slice(7, 9)}`;
      
      case 'DE':
      case 'NG':
      case 'EG':
      case 'MX':
        if (limited.length <= 3) return limited;
        return `${limited.slice(0, 3)} ${limited.slice(3)}`;
      
      case 'IT':
      case 'PH':
      case 'PK':
      case 'TR':
        if (limited.length <= 3) return limited;
        if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
        return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
      
      case 'ES':
      case 'SA':
      case 'AE':
      case 'NZ':
      case 'TH':
      case 'VN':
      case 'IL':
      case 'PL':
      case 'UA':
      case 'FI':
        if (limited.length <= 3) return limited;
        if (limited.length <= 5) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
        return `${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5)}`;
      
      case 'AR':
      case 'ZA':
        if (limited.length <= 2) return limited;
        return `${limited.slice(0, 2)} ${limited.slice(2)}`;
      
      case 'SG':
        if (limited.length <= 4) return limited;
        return `${limited.slice(0, 4)} ${limited.slice(4, 8)}`;
      
      case 'MY':
        if (limited.length <= 2) return limited;
        if (limited.length <= 5) return `${limited.slice(0, 2)}-${limited.slice(2)}`;
        return `${limited.slice(0, 2)}-${limited.slice(2, 5)} ${limited.slice(5)}`;
      
      case 'ID':
        if (limited.length <= 3) return limited;
        if (limited.length <= 7) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
        return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7, 11)}`;
      
      case 'KE':
      case 'NL':
      case 'BE':
      case 'SE':
        if (limited.length <= 3) return limited;
        return `${limited.slice(0, 3)} ${limited.slice(3)}`;
      
      case 'NO':
      case 'DK':
        if (limited.length <= 2) return limited;
        if (limited.length <= 4) return `${limited.slice(0, 2)} ${limited.slice(2)}`;
        if (limited.length <= 6) return `${limited.slice(0, 2)} ${limited.slice(2, 4)} ${limited.slice(4)}`;
        return `${limited.slice(0, 2)} ${limited.slice(2, 4)} ${limited.slice(4, 6)} ${limited.slice(6, 8)}`;
      
      case 'BD':
      case 'RU':
        if (limited.length <= 4) return limited;
        return `${limited.slice(0, 4)}-${limited.slice(4)}`;
      
      default:
        return limited;
    }
  };

  const extractNameFromPrompt = (prompt: string) => {
    if (!prompt) return 'Unknown';
    // Look for common patterns: "Hi [Name]", "Hello [Name]", "Calling for [Name]"
    const patterns = [
      /Hi\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
      /Hello\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
      /calling\s+for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /speak\s+with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /this\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    ];
    
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return 'Unknown';
  };

  const handleStartCall = async () => {
    setErrorMessage('');

    if (!phoneNumber) {
      setErrorMessage('Please enter a phone number to begin the call.');
      return;
    }

    const region = phoneRegions.find(r => r.code === selectedRegion);
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    if (region && cleanedNumber.length !== region.digits) {
      setErrorMessage(`Please enter a valid ${region.name} phone number (${region.digits} digits required).`);
      return;
    }

    setIsProcessing(true);
    setCallStatus('calling');
    setCallProgress(10);
    setElapsedTime(0);
    setCallSummary(null);
    setCallTranscript(null);
    setRecordingUrl(null);
    setIsLoadingSummary(false);
    
    const detectedName = extractNameFromPrompt(customPrompt);
    setCurrentContactName(detectedName);

    try {
      const fullPhoneNumber = `${region?.dialCode}${cleanedNumber}`;

      const selectedPersonaObj = AGENT_PERSONAS.find(p => p.id === selectedPersona);
      const targetVapiId = selectedPersonaObj?.vapiAssistantId || assistantId;

      const response = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
          assistantId: targetVapiId,
          language: language,
          customPrompt: customPrompt,
          advancedSettings: {
            maxDuration: advMaxDuration,
            persona: selectedPersonaObj?.prompt || null,
            personaName: selectedPersonaObj?.name || null,
          }
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      setCallId(data.callId);
      setCallLogId(data.logId || null);
      setControlUrl(data.controlUrl || null);
      setCallProgress(30);
      setCallStatus('in-call');

      pollCallStatus(data.callId, data.logId);
    } catch (error) {
      console.error('Call error:', error);
      const rawError = error instanceof Error ? error.message : 'Failed to start call';
      
      let friendlyError = rawError;
      if (rawError.toLowerCase().includes('phone number is required')) friendlyError = "A valid phone number is required to make a call.";
      else if (rawError.toLowerCase().includes('configuration error')) friendlyError = "The system's telephony configuration is currently offline or improperly set up.";
      else if (rawError.toLowerCase().includes('invalid')) friendlyError = "The phone number entered appears to be invalid or does not exist.";
      
      setErrorMessage(friendlyError);
      setCallStatus('failed');
      setIsProcessing(false);
      setCallProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedContacts: Contact[] = results.data
          .map((row: any, index: number) => {
            const name = row.Name || row.name || row['Full Name'] || 'Unknown';
            const number = row.Phone || row.phone || row.Number || row.number || '';
            if (!number) return null;
            return {
              id: `contact-${Date.now()}-${index}`,
              name,
              number: number.toString().replace(/\D/g, ''),
              status: 'pending' as const
            };
          })
          .filter((c: any) => c !== null) as Contact[];

        setContacts(prev => [...prev, ...parsedContacts]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        setErrorMessage(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  const waitForBatchCallCompletion = (callId: string, contactIndex: number, logId?: string): Promise<void> => {
    return new Promise((resolve) => {
      let polls = 0;
      const maxPolls = 150; // ~5 min per call max
      const interval = setInterval(async () => {
        polls++;
        try {
          const params = new URLSearchParams({ callId });
          if (logId) params.append('logId', logId);
          const response = await fetch(`/api/call?${params.toString()}`);
          const data = await response.json();
          if (data.status === 'completed' || data.status === 'ended') {
            clearInterval(interval);
            setContacts(prev => prev.map((c, idx) => idx === contactIndex ? { ...c, status: 'completed' } : c));
            resolve();
          } else if (data.status === 'failed' || data.status === 'error') {
            clearInterval(interval);
            setContacts(prev => prev.map((c, idx) => idx === contactIndex ? { ...c, status: 'failed' } : c));
            resolve();
          }
          if (polls >= maxPolls) {
            clearInterval(interval);
            setContacts(prev => prev.map((c, idx) => idx === contactIndex ? { ...c, status: 'completed' } : c));
            resolve();
          }
        } catch {
          clearInterval(interval);
          setContacts(prev => prev.map((c, idx) => idx === contactIndex ? { ...c, status: 'failed' } : c));
          resolve();
        }
      }, 3000);
    });
  };

  const startBatchCalls = async () => {
    if (contacts.length === 0) return;
    setIsBatchProcessing(true);
    
    for (let i = 0; i < contacts.length; i++) {
      if (contacts[i].status !== 'pending') continue;
      
      setCurrentBatchIndex(i);
      setCurrentContactName(contacts[i].name);
      // Update phone number state for display purposes
      setPhoneNumber(contacts[i].number);
      setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'calling' } : c));
      
      try {
        const selectedPersonaObj = AGENT_PERSONAS.find(p => p.id === selectedPersona);
        const targetVapiId = selectedPersonaObj?.vapiAssistantId || assistantId;

        const response = await fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: contacts[i].number.startsWith('+') ? contacts[i].number : `+${contacts[i].number}`,
            assistantId: targetVapiId,
            language,
            customPrompt,
            advancedSettings: {
              maxDuration: advMaxDuration,
              persona: selectedPersonaObj?.prompt || null,
              personaName: selectedPersonaObj?.name || null,
            }
          }),
        });

        const data = await response.json();
        if (data.success) {
          // Poll for actual completion before moving to next contact
          await waitForBatchCallCompletion(data.callId, i, data.logId);
        } else {
          setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'failed' } : c));
        }
      } catch (error) {
        setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'failed' } : c));
      }
      
      // Small delay between calls
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setIsBatchProcessing(false);
    setCurrentBatchIndex(-1);
  };

  const handleGeneratePrompt = async () => {
    if (!promptDescription) {
      setErrorMessage('Please enter a description for the AI to generate a prompt');
      return;
    }

    setIsGeneratingPrompt(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/call/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: promptDescription }),
      });

      const data = await response.json();

      if (data.success) {
        setCustomPrompt(data.prompt);
        setPromptDescription('');
        setShowPromptModal(false);
      } else {
        throw new Error(data.error || 'Failed to generate prompt');
      }
    } catch (error) {
      console.error('Prompt generation error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate prompt');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const downloadReport = () => {
    // Generate a proper PDF-like text report with summary & transcript
    const contactName = currentContactName || phoneNumber || 'Unknown';
    const duration = `${String(Math.floor(elapsedTime / 60)).padStart(2, '0')}m ${String(elapsedTime % 60).padStart(2, '0')}s`;
    const date = new Date().toLocaleString();
    
    let reportContent = `RYVON AI - CALL SUMMARY REPORT\n`;
    reportContent += `${'='.repeat(50)}\n\n`;
    reportContent += `Contact: ${contactName}\n`;
    reportContent += `Phone: ${phoneNumber || 'N/A'}\n`;
    reportContent += `Duration: ${duration}\n`;
    reportContent += `Date: ${date}\n`;
    reportContent += `Status: Completed\n\n`;
    
    if (callSummary) {
      reportContent += `${'─'.repeat(50)}\n`;
      reportContent += `AI SUMMARY\n`;
      reportContent += `${'─'.repeat(50)}\n`;
      reportContent += `${callSummary}\n\n`;
    }
    
    reportContent += `${'─'.repeat(50)}\n`;
    reportContent += `FULL TRANSCRIPTION\n`;
    reportContent += `${'─'.repeat(50)}\n`;
    if (callTranscript) {
      callTranscript.split('\n').filter(l => l.trim()).forEach((line, i) => {
        const isUser = line.toLowerCase().startsWith('user:') || line.toLowerCase().startsWith('customer:');
        const cleanLine = line.replace(/^(User|Customer|Assistant|Ryvon):\s*/i, '');
        const speaker = isUser ? (currentContactName || 'Caller') : 'AI Assistant';
        reportContent += `[00:${String(i * 6 + 5).padStart(2, '0')}] ${speaker}: ${cleanLine}\n`;
      });
    } else {
      reportContent += `[00:05] AI Assistant: Hello John, this is Sarah calling from TechCorp. How are you doing today?\n`;
      reportContent += `[00:12] ${currentContactName || 'John Anderson'}: I'm doing well, thanks. What can I help you with?\n`;
    }
    
    reportContent += `\n${'='.repeat(50)}\n`;
    reportContent += `Generated by Ryvon Intelligence Platform\n`;
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ryvon_Call_Report_${contactName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAudio = async () => {
    if (recordingUrl) {
      try {
        const response = await fetch(recordingUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Ryvon_Call_Recording_${(currentContactName || 'Unknown').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        setErrorMessage('Failed to download audio recording.');
      }
    } else {
      setErrorMessage('No recording available for this call.');
    }
  };

  const handleShareSummary = async () => {
    const contactName = currentContactName || phoneNumber || 'Unknown';
    const duration = `${String(Math.floor(elapsedTime / 60)).padStart(2, '0')}m ${String(elapsedTime % 60).padStart(2, '0')}s`;
    
    let shareText = `Ryvon AI Call Summary\n\nContact: ${contactName}\nDuration: ${duration}\nDate: ${new Date().toLocaleString()}\n`;
    if (callSummary) shareText += `\nSummary: ${callSummary}\n`;
    if (callTranscript) {
      shareText += `\nTranscript:\n`;
      callTranscript.split('\n').filter(l => l.trim()).forEach(line => {
        shareText += `${line}\n`;
      });
    }
    
    // Try native share API first, then fall back to clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ryvon AI Call Summary', text: shareText });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareText);
          setErrorMessage('Summary copied to clipboard!');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setErrorMessage('Summary copied to clipboard!');
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) {
      if (recordingUrl) {
        audioRef.current = new Audio(recordingUrl);
        audioRef.current.addEventListener('timeupdate', () => {
          setPlaybackTime(audioRef.current?.currentTime || 0);
        });
        audioRef.current.addEventListener('loadedmetadata', () => {
          setPlaybackDuration(audioRef.current?.duration || 0);
        });
        audioRef.current.addEventListener('ended', () => {
          setIsPlayingRecording(false);
          setPlaybackTime(0);
        });
      } else {
        setErrorMessage('No recording available for this call.');
        return;
      }
    }
    
    if (isPlayingRecording) {
      audioRef.current.pause();
      setIsPlayingRecording(false);
    } else {
      audioRef.current.play();
      setIsPlayingRecording(true);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const pollCallStatus = (id: string, logId?: string) => {
    let pollCount = 0;
    const maxPolls = 300;

    // Clean up any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Immediate first poll
    const runPoll = async () => {
      pollCount++;

      try {
        const params = new URLSearchParams({ callId: id });
        if (logId) params.append('logId', logId);
        const response = await fetch(`/api/call?${params.toString()}`);
        const data = await response.json();

        console.log('Call status:', data.status);

        setCallProgress(prev => Math.min(prev + 2, 95));

        if (data.status === 'completed' || data.status === 'ended') {
          setCallProgress(100);
          
          const successfulReasons = ['customer-ended-call', 'assistant-ended-call', 'voicemail-outcome', 'max-duration-reached', 'silence-timeout', 'hangup', 'hang', 'user-ended-call', 'participant-ended-call'];
          if (data.endedReason && !successfulReasons.includes(data.endedReason)) {
            setCallStatus('failed');
            
            let reasonText = "The call dropped unexpectedly.";
            const rawReason = data.endedReason.toLowerCase();
            if (rawReason.includes('customer-did-not-answer') || rawReason.includes('no-answer')) reasonText = "The customer didn't answer and the call timed out.";
            else if (rawReason.includes('customer-busy')) reasonText = "The call could not go through because the customer's line is busy.";
            else if (rawReason.includes('voicemail')) reasonText = "The call was intercepted by an automated voicemail system.";
            else if (rawReason.includes('invalid') || rawReason.includes('unallocated')) reasonText = "The dialed phone number does not exist or is currently unallocated.";
            else if (rawReason.includes('pipeline') || rawReason.includes('routing')) reasonText = "Call failed to connect due to a line routing error.";
            
            setErrorMessage(reasonText);
            setIsLoadingSummary(false);
          } else {
            // Immediately show completed state
            setCallStatus('completed');
            
            // If summary isn't ready yet, show loading indicator
            if (!data.summary && !data.transcript) {
              setIsLoadingSummary(true);
            } else {
              setIsLoadingSummary(false);
            }
          }
          
          setCallSummary(data.summary || null);
          setCallTranscript(data.transcript || null);
          setRecordingUrl(data.recordingUrl || null);
          setIsProcessing(false);
          
          if (data.duration) setElapsedTime(data.duration);
          globalMutate('/api/call/logs');
          
          // Termination condition: Stop if we have data OR we've hit the poll limit
          // If the call failed with an error reason, stop immediately (no summary coming)
          const isFailedStatus = data.status === 'failed' || (data.endedReason && !successfulReasons.includes(data.endedReason));
          
          if (data.summary || data.transcript || isFailedStatus || pollCount > maxPolls) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        } else if (data.status === 'failed' || data.status === 'error') {
          setCallStatus('failed');
          setIsProcessing(false);
          
          let reasonText = "The call failed to initialize.";
          if (data.endedReason) {
             const rawReason = data.endedReason.toLowerCase();
             if (rawReason.includes('customer-did-not-answer') || rawReason.includes('no-answer')) reasonText = "The customer didn't answer and the call timed out.";
             else if (rawReason.includes('customer-busy')) reasonText = "The call could not go through because the customer's line is busy.";
             else if (rawReason.includes('voicemail')) reasonText = "The call was intercepted by an automated voicemail system.";
             else if (rawReason.includes('invalid') || rawReason.includes('unallocated')) reasonText = "The dialed phone number does not exist or is currently unallocated.";
             else if (rawReason.includes('pipeline') || rawReason.includes('routing')) reasonText = "Call failed to connect due to a telephony routing error.";
             else reasonText = `Call failed: ${data.endedReason.replace(/-/g, ' ')}`;
          }

          setErrorMessage(reasonText);
          
          globalMutate('/api/call/logs');
          
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        if (pollCount >= maxPolls) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setCallStatus('completed');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    };

    // Run first poll immediately, then start 1000ms interval
    runPoll();
    const interval = setInterval(runPoll, 1000);

    // interval declaration is moved above
    pollIntervalRef.current = interval;
  };

  // Call Control Handlers
  const handleMuteToggle = async () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);

    // Send mute/unmute via Vapi PATCH API
    if (callId) {
      try {
        await fetch(`/api/call/control`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId,
            action: newMuteState ? 'mute' : 'unmute',
          }),
        });
      } catch (error) {
        console.error('Failed to toggle mute:', error);
      }
    }
  };

  const handleAddNotes = () => {
    setShowNotesModal(true);
  };

  const handleSaveNotes = () => {
    // Notes are stored in callNotes state and will be available for the call summary
    setShowNotesModal(false);
  };

  const handleTransfer = () => {
    setShowTransferModal(true);
  };

  const handleConfirmTransfer = async () => {
    if (!transferNumber || !callId) return;
    try {
      const response = await fetch('/api/call/control', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, action: 'transfer', transferNumber }),
      });
      const data = await response.json();
      if (data.success) {
        setShowTransferModal(false);
        setTransferNumber('');
      } else {
        setErrorMessage(data.error || 'Failed to transfer call');
      }
    } catch (error) {
      setErrorMessage('Failed to transfer call. Please try again.');
    }
  };

  const handleEndCall = async () => {
    // Terminate the actual Vapi call first
    if (callId) {
      try {
        await fetch('/api/call/control', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId, action: 'end' }),
        });
      } catch (error) {
        console.error('Failed to end call via API:', error);
      }
    }
    // Clean up polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Refresh call logs
    globalMutate('/api/call/logs');
    // Transition to completed state (not idle reset) so user sees the summary
    setCallStatus('completed');
    setIsProcessing(false);
    setIsAISpeaking(false);
    setIsMuted(false);
    setShowNotesModal(false);
    setShowTransferModal(false);
    setControlUrl(null);
  };

  const handleReset = () => {
    setCallStatus('idle');
    setCallProgress(0);
    setIsProcessing(false);
    setCallId(null);
    setCallLogId(null);
    setControlUrl(null);
    setCallSummary(null);
    setCallTranscript(null);
    setRecordingUrl(null);
    setIsPlayingRecording(false);
    setPlaybackTime(0);
    setPlaybackDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setErrorMessage('');
    setPhoneNumber('');
    setElapsedTime(0);
    setIsAISpeaking(false);
    setIsMuted(false);
    setCallNotes('');
    setShowNotesModal(false);
    setShowTransferModal(false);
    setTransferNumber('');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (params.has('logId')) {
      params.delete('logId');
      router.push(`/call-agent?${params.toString()}`);
    }
  };

  const getFullPhoneNumber = () => {
    const region = phoneRegions.find(r => r.code === selectedRegion);
    return `${region?.dialCode} ${phoneNumber}`;
  };

  if (!mounted) {
    return null;
  }

  const currentRegion = phoneRegions.find(r => r.code === selectedRegion);

  return (
    <div className="min-h-[100dvh] agent-bg font-motive flex overflow-hidden">
      {/* Call Details Modal - REMOVED for Unified UI */}

      {/* Error Message Modal */}
      {errorMessage && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            onClick={() => setErrorMessage('')}
          />
          <div className="relative w-full max-w-md bg-[#05111e] border border-red-500/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Attention Required</h3>
              <p className="text-sm text-gray-400 leading-relaxed max-w-[90%] mx-auto">
                {errorMessage}
              </p>
            </div>
            <div className="p-6 pt-0 flex justify-center">
              <button 
                onClick={() => setErrorMessage('')}
                className="w-full sm:w-auto px-10 py-3 bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-white/20 rounded-[2rem] text-sm font-semibold text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 0 30px rgba(30,167,255,0.6)); }
          50% { transform: translateY(-12px) scale(1.02); filter: drop-shadow(0 0 60px rgba(63,210,255,0.9)); }
        }
        @keyframes subtleZoom {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.8; }
          50% { transform: translateX(-50%) scale(1.2); opacity: 0.4; }
        }
        @keyframes sweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes beep {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.35); filter: brightness(1.5); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-ambient-orb { animation: subtleZoom 12s ease-in-out infinite; }
        .animate-beep { animation: beep 0.3s ease-in-out; }
        .btn-sweep {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), rgba(255,255,255,0.4), rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: sweep 3s infinite linear;
        }
      `}} />
      <div ref={layoutContainerRef} className="flex-1 overflow-y-auto flex flex-col p-4 sm:p-5 lg:p-6 custom-scrollbar relative z-10">
        {/* Background gradient orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1EA7FF]/20 via-[#1EA7FF]/5 to-transparent blur-3xl pointer-events-none animate-ambient-orb transform origin-top" />
        
        <div className="max-w-4xl w-full mx-auto relative z-20 mt-4 sm:mt-8">
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8 sm:mb-10 gap-4">
            <div className="flex items-center gap-2">
              <SidebarToggle className="text-white" />
              {/* Branding - Left on Desktop */}
              <div className="hidden sm:inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-black/30 backdrop-blur-xl border border-[#1EA7FF]/20 shadow-[0_0_15px_rgba(30,167,255,0.1)] rounded-full text-[13px] font-bold text-white transition-all duration-250">
                <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">RyvonAI v1.0</span>
              </div>
            </div>
            
            {/* Branding - Right on Mobile */}
            <div className="sm:hidden">
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-black/30 backdrop-blur-xl border border-[#1EA7FF]/20 rounded-full text-[13px] font-bold text-white transition-all duration-250">
                <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">RyvonAI v1.0</span>
              </div>
            </div>
          </div>

          <header className="text-center mb-6 sm:mb-8 mt-6 sm:-mt-12">
            <div className="mb-6">
              <img 
                src="/images/call-header.png" 
                alt="RyvonAI Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full"
                style={{
                  mixBlendMode: 'screen',
                  filter: 'contrast(1.1) brightness(1.2) drop-shadow(0 0 20px rgba(30,167,255,0.4))',
                }}
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {isBatchProcessing ? "Initiating Batch Call" : (callStatus === 'idle' || callStatus === 'failed') ? "Make A New Call" : callStatus === 'completed' ? "Call Summary" : "Active Call"}
            </h1>
          </header>



          {/* STATE: IDLE OR FAILED */}
          {(callStatus === 'idle' || callStatus === 'failed') && (
            <div className="bg-white/[0.01] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-6 sm:p-8 lg:p-10 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-10 w-full max-w-4xl mx-auto relative z-20">
              <div className="idle-anim-item mb-8 relative z-20">
                <div className="flex justify-between items-center text-sm text-gray-400 mb-3 font-medium">
                  <span>Contact Selection</span>
                </div>
                <div className="flex w-full sm:w-fit mb-6 relative z-20 bg-transparent border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[5rem] overflow-hidden">
                  <button onClick={() => setActiveTab('manual')} className={`px-8 py-3 sm:py-2 text-sm font-medium transition-all duration-300 cursor-pointer outline-none focus:outline-none ${activeTab === 'manual' ? 'bg-gradient-to-r from-[#000000] to-[#1EA7FF]/80 text-white' : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}>Manual Input</button>
                  <div className="w-[1px] bg-white/10 z-10 shrink-0"></div>
                  <button onClick={() => setActiveTab('import')} className={`px-8 py-3 sm:py-2 text-sm font-medium transition-all duration-300 cursor-pointer outline-none focus:outline-none ${activeTab === 'import' ? 'bg-gradient-to-r from-[#1EA7FF]/80 to-[#000000] text-white' : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}>Import List</button>
                </div>
                
                {activeTab === 'manual' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-transparent border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-full p-1.5 flex items-center h-12 focus-within:border-white/20 focus-within:bg-gradient-to-b focus-within:from-[#05111e]/90 focus-within:to-[#1EA7FF]/20 transition-colors relative z-20">
                       <div className="relative h-full flex items-center border-r border-white/10 w-28 shrink-0 bg-transparent rounded-l-full ml-0.5">
                         <Select value={selectedRegion} onValueChange={(val) => {setSelectedRegion(val); setPhoneNumber('');}}>
                           <SelectTrigger className="w-full h-full bg-transparent border-0 ring-0 focus:ring-0 focus:ring-offset-0 text-white text-xs sm:text-sm font-medium px-3 shadow-none hover:bg-white/5 transition-colors rounded-l-full [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-gray-500 [&>span]:w-full [&>span]:text-left">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="bg-[#0b1420]/95 backdrop-blur-xl border-white/10 text-white rounded-xl z-[100] max-h-[300px]">
                             {phoneRegions.map((region) => (
                               <SelectItem key={region.code} value={region.code} className="focus:bg-[#1EA7FF]/20 focus:text-white rounded-lg cursor-pointer">
                                 {region.flag} {region.dialCode}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value, selectedRegion))} placeholder={currentRegion?.placeholder || "Phone Number"} className="w-full bg-transparent text-white text-sm outline-none px-4 placeholder:text-gray-600 h-full relative z-20" />
                    </div>
                  </div>
                )}
                {activeTab === 'import' && (
                  <div className="border-2 border-dashed border-white/10 bg-black/20 rounded-2xl p-8 flex items-center justify-center mb-2 hover:border-[#1EA7FF]/50 hover:bg-[#1EA7FF]/5 transition-all cursor-pointer animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden relative z-20" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                    <div className="text-center relative z-10">
                      <div className="w-12 h-12 rounded-full bg-[#1EA7FF]/10 flex items-center justify-center mx-auto mb-3 text-[#1EA7FF]">
                         <Upload className="w-5 h-5 mx-auto" />
                      </div>
                      <p className="text-white text-sm font-medium mb-1">Upload Contacts CSV</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Supports Name, Phone</p>
                    </div>
                    {contacts.length > 0 && <div className="absolute top-4 right-4 bg-[#1EA7FF] text-white text-[10px] font-bold px-2 py-1 rounded shadow overflow-hidden z-20">{contacts.length} Loaded</div>}
                  </div>
                )}
              </div>

              <div className="idle-anim-item grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-20">
                <div>
                  <label className="block text-sm text-gray-400 mb-3 font-medium">Agent Character</label>
                  <div className="relative">
                    <Select value={selectedPersona || 'none'} onValueChange={(val) => {
                      setSelectedPersona(val === 'none' ? null : val);
                    }}>
                      <SelectTrigger className="w-full px-5 py-3 h-auto min-h-[48px] bg-transparent border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-full text-white text-sm font-medium hover:bg-white/5 hover:border-white/20 transition-colors focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-gradient-to-b data-[state=open]:from-[#05111e]/90 data-[state=open]:to-[#1EA7FF]/20 [&>svg]:opacity-100 [&>svg]:text-gray-500 [&>svg]:w-4 [&>svg]:h-4 relative z-20">
                        <SelectValue placeholder="Standard Agent" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0b1420]/95 backdrop-blur-xl border-white/10 text-white rounded-2xl z-[100] max-h-[400px]">
                        <SelectItem value="none" className="focus:bg-[#1EA7FF]/20 focus:text-white rounded-xl cursor-pointer py-3 font-medium">
                          Standard Agent (Generic)
                        </SelectItem>
                        
                        {Array.from(new Set(AGENT_PERSONAS.map(p => p.category))).map(category => (
                          <div key={category} className="mt-2 first:mt-0">
                            <div className="px-4 py-2 text-[10px] font-bold text-[#1EA7FF] uppercase tracking-widest">{category}</div>
                            {AGENT_PERSONAS.filter(p => p.category === category).map(persona => (
                              <SelectItem key={persona.id} value={persona.id} className="focus:bg-[#1EA7FF]/20 focus:text-white rounded-xl cursor-pointer py-3">
                                <div className="flex flex-col text-left">
                                  <span className="font-bold text-sm">{persona.name}</span>
                                  <span className="text-[10px] text-gray-400">{persona.role}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-3 font-medium">Language</label>
                  <div className="relative">
                    <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                       <SelectTrigger className="w-full px-5 py-3 h-auto min-h-[48px] bg-transparent border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-full text-white text-sm font-medium hover:bg-white/5 hover:border-white/20 transition-colors focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-gradient-to-b data-[state=open]:from-[#05111e]/90 data-[state=open]:to-[#1EA7FF]/20 [&>svg]:opacity-100 [&>svg]:text-gray-500 [&>svg]:w-4 [&>svg]:h-4 relative z-20">
                         <SelectValue placeholder="Language" />
                       </SelectTrigger>
                       <SelectContent className="bg-[#0b1420]/95 backdrop-blur-xl border-white/10 text-white rounded-2xl z-[100]">
                         <SelectItem value="en" className="focus:bg-[#1EA7FF]/20 focus:text-white rounded-xl cursor-pointer py-3">English (US)</SelectItem>
                         <SelectItem value="hi" className="focus:bg-[#1EA7FF]/20 focus:text-white rounded-xl cursor-pointer py-3">Hindi (हिन्दी)</SelectItem>
                         <SelectItem value="es" className="focus:bg-[#1EA7FF]/20 focus:text-white rounded-xl cursor-pointer py-3">Spanish (Español)</SelectItem>
                         <SelectItem value="fr" className="focus:bg-[#1EA7FF]/20 focus:text-white rounded-xl cursor-pointer py-3">French (Français)</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="idle-anim-item mb-8 relative z-20">
                <div className="flex justify-between items-center mb-3">
                   <label className="block text-sm text-gray-400 font-medium">Call Objective/script</label>
                   <div className="flex items-center gap-2">
                     <button onClick={() => setShowPromptModal(true)} disabled={isGeneratingPrompt} className="text-[10px] uppercase tracking-widest text-[#1EA7FF] font-bold hover:underline cursor-pointer">Auto Generate</button>
                   </div>
                </div>
                <div className="bg-transparent border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-1 relative focus-within:border-white/30 transition-colors z-20">
                  <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Enter your conversation script here..." className="w-full min-h-[140px] bg-transparent text-white text-sm outline-none p-5 resize-none font-medium placeholder:font-normal placeholder:text-gray-600 custom-scrollbar relative z-20" />
                </div>
              </div>

              {/* AI Prompt Generation Modal */}
              {showPromptModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-[#05111e] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative">
                    <button onClick={() => setShowPromptModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer">
                      <XCircle className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                        {/* Glowing backdrop */}
                        <div className="absolute inset-0 bg-[#1EA7FF]/20 rounded-full blur-xl animate-pulse" />
                        
                        {/* Rotating gradient rings */}
                        <div className="absolute inset-0 rounded-full border-[1.5px] border-t-[#1EA7FF] border-r-[#1EA7FF]/30 border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '3s' }} />
                        <div className="absolute inset-1.5 rounded-full border-[1.5px] border-b-[#3FD2FF] border-l-[#3FD2FF]/30 border-t-transparent border-r-transparent animate-[spin_2s_linear_infinite_reverse]" />
                        
                        {/* Core Interface */}
                        <div className="relative w-9 h-9 bg-gradient-to-br from-[#05111e] to-[#1EA7FF]/20 rounded-full border border-[#1EA7FF]/50 shadow-[inset_0_0_10px_rgba(30,167,255,0.4)] flex items-center justify-center z-10 transition-transform hover:scale-110">
                          <svg className="w-5 h-5 text-[#3FD2FF] drop-shadow-[0_0_8px_rgba(63,210,255,0.8)] animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                            <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">AI Script Generator</h2>
                        <p className="text-sm text-gray-400">Describe your call objective below</p>
                      </div>
                    </div>
                    <textarea 
                      value={promptDescription} 
                      onChange={(e) => setPromptDescription(e.target.value)} 
                      placeholder="E.g. Sell solar panels in California focusing on eco-friendly tax credits..." 
                      className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl text-white text-sm outline-none p-4 resize-none focus:border-white/20 focus:bg-gradient-to-b focus:from-[#05111e]/90 focus:to-[#1EA7FF]/20 transition-colors mb-6 custom-scrollbar" 
                      autoFocus
                    />
                    <div className="flex justify-end gap-3 hover:translate-y-0">
                      <button onClick={() => setShowPromptModal(false)} className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">Cancel</button>
                      <button 
                        onClick={handleGeneratePrompt} 
                        disabled={isGeneratingPrompt || !promptDescription} 
                        className="px-6 py-2.5 bg-gradient-to-r from-[#1EA7FF] to-[#3FD2FF] rounded-full text-sm font-semibold text-white shadow-[0_4px_12px_rgba(30,167,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(30,167,255,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isGeneratingPrompt ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                          'Generate Script'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Settings */}
              <div className="idle-anim-item mb-10 relative z-20">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-5 py-4 border border-white/10 bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl flex items-center justify-between text-sm text-gray-300 font-medium hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-[#1EA7FF] transition-all duration-700 ease-in-out group-hover:rotate-180 group-hover:scale-110" /> 
                    Advanced Settings
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : 'rotate-0'}`} />
                </button>

                {showAdvanced && (
                  <div className="mt-2 p-6 sm:p-8 bg-white/[0.01] border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl rounded-3xl animate-in fade-in slide-in-from-top-2 duration-300 space-y-6 relative z-20">
                    
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#1EA7FF]"/>
                        Call Duration Limit
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                           <label className="block text-xs text-gray-400 mb-2 font-medium">Max Call Duration (Minutes)</label>
                           <div className="flex items-center gap-3">
                             <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1 shadow-inner group/stepper focus-within:border-[#1EA7FF]/40 transition-all">
                               <button 
                                 onClick={() => setAdvMaxDuration(prev => Math.max(1, parseInt(prev) - 1).toString())}
                                 className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                               >
                                 <Plus className="w-4 h-4 rotate-45" />
                               </button>
                               
                               <div className="w-14 text-center">
                                 <span className="text-lg font-bold text-white tracking-widest leading-none block">{advMaxDuration}</span>
                                 <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter -mt-1 block">MINS</span>
                               </div>

                               <button 
                                 onClick={() => setAdvMaxDuration(prev => Math.min(60, parseInt(prev) + 1).toString())}
                                 className="w-10 h-10 rounded-xl flex items-center justify-center text-[#1EA7FF] hover:bg-[#1EA7FF]/10 active:scale-95 transition-all cursor-pointer"
                               >
                                 <Plus className="w-4 h-4" />
                               </button>
                             </div>
                             
                             <div className="hidden sm:block h-10 w-[1px] bg-white/5 mx-1" />
                             
                             <div className="flex flex-col justify-center">
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-tight">Limit Setting</p>
                               <p className="text-[10px] text-[#1EA7FF] font-black uppercase tracking-tighter animate-pulse">{parseInt(advMaxDuration) >= 30 ? 'EXTENDED MODE' : 'STANDARD MODE'}</p>
                             </div>
                           </div>
                           <p className="text-[10px] text-gray-600 mt-3 ml-1 font-medium italic">The AI will politely wrap up the conversation as it approaches this limit.</p>
                        </div>
                        <div className="flex items-end">
                           <div className="bg-[#1EA7FF]/5 border border-[#1EA7FF]/10 rounded-xl p-4 w-full">
                             <p className="text-[11px] text-gray-400 leading-relaxed">
                               <span className="text-[#1EA7FF] font-semibold">Tip:</span> The agent's voice, personality, and AI model are managed by the selected Agent Character above. Advanced overrides happen in the Vapi dashboard.
                             </p>
                           </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              <div className="idle-anim-item grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-20">
                <button onClick={activeTab === 'import' ? startBatchCalls : handleStartCall} disabled={isProcessing || (activeTab==='manual' && !phoneNumber) || (activeTab==='import' && contacts.length===0)} className="w-full py-4 bg-gradient-to-b from-[#000000] to-[#32A2F2]/30 hover:to-[#32A2F2]/70 border border-white/20 hover:border-white/40 rounded-[5rem] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(50,162,242,0.2)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer z-30 relative group overflow-hidden">
                  <div className="absolute inset-0 btn-sweep rounded-[5rem] mix-blend-overlay pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
                  <Phone className="w-4 h-4 relative z-10" /> <span className="relative z-10">{activeTab === 'import' ? 'Start Batch Calling' : 'Start Call Now'}</span>
                </button>
                <button 
                  onClick={() => setShowScheduleModal(true)} 
                  className="w-full py-4 bg-black/40 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[5rem] text-sm font-semibold text-white transition-all hover:bg-white/5 hover:border-white/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 z-20"
                >
                  <Clock className="w-4 h-4" /> Schedule for Later
                </button>
              </div>

              {/* Import List UI if Active Tabs (Table part only) */}
              {activeTab === 'import' && contacts.length > 0 && (
                 <div className="mt-8 bg-black/40 border border-white/10 rounded-2xl overflow-hidden relative z-20">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                      <h3 className="text-sm font-semibold text-white">Imported Contacts</h3>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => setContacts([])} className="p-2 text-gray-500 hover:text-red-500 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                     <table className="w-full text-left">
                       <thead className="sticky top-0 bg-[#0b1420] z-10 border-b border-white/5">
                          <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-3 font-medium">Name</th>
                            <th className="px-6 py-3 font-medium">Phone Number</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 bg-black/20">
                         {contacts.map((contact, idx) => (
                           <tr key={contact.id} className={`${idx === currentBatchIndex ? 'bg-[#1EA7FF]/10' : ''}`}>
                             <td className="px-6 py-3 text-xs text-white font-medium">{contact.name}</td>
                             <td className="px-6 py-3 text-xs text-gray-400">+{contact.number}</td>
                             <td className="px-6 py-3">
                               {contact.status === 'pending' && <span className="flex items-center gap-1.5 text-xs text-gray-500"><Clock className="w-3 h-3" /> Pending</span>}
                               {contact.status === 'calling' && <span className="flex items-center gap-1.5 text-xs text-[#1EA7FF] animate-pulse"><Phone className="w-3 h-3" /> Calling...</span>}
                               {contact.status === 'completed' && <span className="flex items-center gap-1.5 text-xs text-green-500"><CheckCircle className="w-3 h-3" /> Completed</span>}
                               {contact.status === 'failed' && <span className="flex items-center gap-1.5 text-xs text-red-500"><XCircle className="w-3 h-3" /> Failed</span>}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
                 </div>
              )}
            </div>
          )}

          {/* STATE: CALLING / IN-CALL */}
          {(callStatus === 'calling' || callStatus === 'in-call') && (
            <div className="bg-white/[0.01] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_80px_rgba(30,167,255,0.15)] mb-10 w-full max-w-4xl mx-auto space-y-8 relative z-20">
              
              <div className="call-anim-item">
                <p className="text-gray-400 text-sm mb-3 ml-1 font-medium">Call Overview</p>
                <div className="bg-gradient-to-b from-transparent via-transparent to-[#1EA7FF]/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full hidden sm:flex items-center justify-center bg-[url(/images/icon-bg.webp)] bg-cover bg-center shrink-0">
                       <img src="/images/dp.svg" className="w-6 h-6" alt="User DP" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base sm:text-lg">{currentContactName}</h3>
                      <p className="text-gray-400 text-xs sm:text-sm mt-0.5">{getFullPhoneNumber() || '+1 (555) 123-6745'}</p>
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-light text-[#1EA7FF] tracking-[0.1em] drop-shadow-[0_0_10px_rgba(30,167,255,0.4)]">
                     {`${String(Math.floor(elapsedTime / 60)).padStart(2, '0')}:${String(elapsedTime % 60).padStart(2, '0')}`}
                  </div>
                </div>
              </div>

              <div className="call-anim-item">
                <p className="text-gray-400 text-sm mb-3 ml-1 font-medium">AI Speaking Indicator</p>
                <div className="bg-gradient-to-b from-transparent via-transparent to-[#1EA7FF]/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-6 flex flex-col items-center justify-center h-28 relative overflow-hidden">
                   {/* Waveform graphic */}
                   <div className="flex items-center gap-1.5 h-16 mb-4 z-10 w-full justify-center">
                     {[...Array(24)].map((_, i) => (
                        <div key={i} className={`hidden sm:block w-1.5 rounded-full ${isAISpeaking ? 'bg-gradient-to-b from-[#46CBFF] via-[#46CBFF] to-[#32417F] animate-[pulse_1s_ease-in-out_infinite]' : 'bg-white/20'}`} style={{
                           height: isAISpeaking ? `${Math.max(20, Math.random() * 100)}%` : '10%',
                           animationDelay: `${i * 0.05}s`
                        }}></div>
                     ))}
                     {[...Array(12)].map((_, i) => (
                        <div key={`mob-${i}`} className={`block sm:hidden w-1.5 rounded-full ${isAISpeaking ? 'bg-gradient-to-b from-[#46CBFF] via-[#46CBFF] to-[#32417F] animate-[pulse_1s_ease-in-out_infinite]' : 'bg-white/20'}`} style={{
                           height: isAISpeaking ? `${Math.max(20, Math.random() * 100)}%` : '10%',
                           animationDelay: `${i * 0.05}s`
                        }}></div>
                     ))}
                   </div>
                   <p className="text-gray-400 text-sm relative z-10 font-medium tracking-wide">
                      {callStatus === 'calling' ? (
                        callProgress < 20 ? 'Authenticating Persona...' :
                        callProgress < 40 ? 'Routing...' :
                        callProgress < 60 ? 'Dialing...' : 'Connecting...'
                      ) : isAISpeaking ? 'AI is speaking...' : 'Waiting for response...'}
                   </p>
                   <div className={`absolute bottom-0 left-0 right-0 h-[80%] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#46CBFF]/20 to-transparent blur-2xl transition-opacity duration-1000 ${isAISpeaking ? 'opacity-100' : 'opacity-0'}`}></div>
                </div>
              </div>

              <div className="call-anim-item">
                <p className="text-gray-400 text-sm mb-3 ml-1 font-medium">Call Controls</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <button onClick={handleMuteToggle} className={`${isMuted ? 'bg-[#1EA7FF]/10 border-[#1EA7FF]/40' : 'bg-gradient-to-b from-transparent via-transparent to-[#1EA7FF]/5 border-white/10'} border shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-2xl py-9 flex flex-col items-center justify-center gap-4 hover:border-[#1EA7FF]/50 hover:scale-105 hover:shadow-[0_0_25px_rgba(30,167,255,0.15)] transition-all text-white group cursor-pointer relative z-30`}>
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-[url(/images/icon-bg.webp)] bg-cover bg-center group-hover:animate-beep transition-transform"><svg className="w-5 h-5 text-[#1EA7FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg></div>
                      <span className="text-xs font-semibold">{isMuted ? 'Unmute' : 'Mute'}</span>
                   </button>
                   <button onClick={handleAddNotes} className="bg-gradient-to-b from-transparent via-transparent to-[#1EA7FF]/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-2xl py-9 flex flex-col items-center justify-center gap-4 hover:border-[#1EA7FF]/50 hover:scale-105 hover:shadow-[0_0_25px_rgba(30,167,255,0.15)] transition-all text-white group cursor-pointer relative z-30">
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-[url(/images/icon-bg.webp)] bg-cover bg-center group-hover:animate-beep transition-transform"><FileText className="w-5 h-5 text-[#1EA7FF]" /></div>
                      <span className="text-xs font-semibold">Add Notes</span>
                   </button>
                   <button onClick={handleTransfer} className="bg-gradient-to-b from-transparent via-transparent to-[#1EA7FF]/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-2xl py-9 flex flex-col items-center justify-center gap-4 hover:border-[#1EA7FF]/50 hover:scale-105 hover:shadow-[0_0_25px_rgba(30,167,255,0.15)] transition-all text-white group cursor-pointer relative z-30">
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-[url(/images/icon-bg.webp)] bg-cover bg-center group-hover:animate-beep transition-transform"><img src="/images/transfer.svg" className="w-6 h-6" alt="Transfer" /></div>
                      <span className="text-xs font-semibold">Transfer</span>
                   </button>
                   <button onClick={handleEndCall} className="bg-gradient-to-b from-transparent via-transparent to-red-500/5 border border-red-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl py-9 flex flex-col items-center justify-center gap-4 hover:bg-red-500/20 hover:border-red-500/40 transition-all text-red-500 group shadow-[0_0_20px_rgba(239,68,68,0.05)] hover:shadow-[0_0_35px_rgba(239,68,68,0.2)] cursor-pointer relative z-30">
                      <div className="w-14 h-14 rounded-full border border-red-500/40 flex items-center justify-center bg-[radial-gradient(circle,_rgba(239,68,68,0.5)_0%,_transparent_70%)] shadow-[0_0_25px_rgba(239,68,68,0.25)] group-hover:scale-110 transition-transform">
                        <img src="/images/end-call.svg" className="w-6 h-6" alt="End Call" />
                      </div>
                      <span className="text-xs font-semibold">End call</span>
                   </button>
                </div>
              </div>
            </div>
          )}

               {/* Notes Modal */}
               {showNotesModal && (
                 <div className="animate-in fade-in duration-300">
                   <p className="text-gray-400 text-sm mb-3 ml-1 font-medium">Call Notes</p>
                   <div className="bg-gradient-to-b from-transparent via-transparent to-[#1EA7FF]/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-2xl p-5">
                     <textarea
                       value={callNotes}
                       onChange={(e) => setCallNotes(e.target.value)}
                       placeholder="Type your notes here..."
                       className="w-full min-h-[120px] bg-transparent text-white text-sm placeholder:text-gray-500 border-none outline-none resize-none"
                     />
                     <div className="flex justify-end gap-3 mt-4">
                       <button onClick={() => setShowNotesModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">Cancel</button>
                       <button onClick={handleSaveNotes} className="px-5 py-2 text-xs font-semibold text-white bg-[#1EA7FF]/20 border border-[#1EA7FF]/30 rounded-lg hover:bg-[#1EA7FF]/30 transition-all cursor-pointer">Save Notes</button>
                     </div>
                   </div>
                 </div>
               )}

               {/* Transfer Modal */}
               {showTransferModal && (
                 <div className="animate-in fade-in duration-300">
                   <p className="text-gray-400 text-sm mb-3 ml-1 font-medium">Transfer Call</p>
                   <div className="bg-gradient-to-b from-transparent via-transparent to-[#1EA7FF]/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-2xl p-5">
                     <p className="text-gray-400 text-xs mb-3">Enter the phone number to transfer this call to:</p>
                     <input
                       type="tel"
                       value={transferNumber}
                       onChange={(e) => setTransferNumber(e.target.value)}
                       placeholder="+1 (555) 000-0000"
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-500 outline-none focus:border-[#1EA7FF]/50 transition-colors"
                     />
                     <div className="flex justify-end gap-3 mt-4">
                       <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">Cancel</button>
                       <button onClick={handleConfirmTransfer} disabled={!transferNumber} className="px-5 py-2 text-xs font-semibold text-white bg-[#1EA7FF]/20 border border-[#1EA7FF]/30 rounded-lg hover:bg-[#1EA7FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Transfer Now</button>
                     </div>
                   </div>
                 </div>
               )}

          {/* STATE: COMPLETED */}
          {callStatus === 'completed' && (
            <div className="w-full max-w-4xl mx-auto space-y-6 relative z-20 mb-10">

              {/* Loading Summary Indicator */}
              {isLoadingSummary && (
                <div className="bg-[#1EA7FF]/5 border border-[#1EA7FF]/20 rounded-3xl p-6 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-[#1EA7FF]/20 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 text-[#1EA7FF] animate-spin" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Generating Call Summary...</p>
                    <p className="text-gray-400 text-xs mt-0.5">This may take a few moments while the AI processes the conversation.</p>
                  </div>
                </div>
              )}

              {/* Call Overview Section */}
              <div className="completed-anim-item flex justify-between items-center mb-1">
                <p className="text-white text-sm font-medium ml-1">Call Overview</p>
                <button 
                  onClick={handleReset}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] uppercase tracking-widest font-bold text-[#1EA7FF] transition-all flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" /> New Call
                </button>
              </div>
              
              {/* Profile & Summary Grid */}
              <div className="completed-anim-item grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">

                {/* Profile Card */}
                <div className="bg-white/[0.03] border border-white/15 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl relative overflow-hidden group h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1EA7FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-full bg-[url(/images/icon-bg.webp)] bg-cover bg-center flex items-center justify-center shrink-0 border border-white/10">
                      <img src="/images/dp.svg" className="w-7 h-7" alt="Profile" />
                    </div>
                    <div>
                      <h3 className="text-[#1EA7FF] font-bold text-lg leading-tight truncate max-w-[140px]">{currentContactName || phoneNumber || 'Unknown'}</h3>
                      <p className="text-white text-sm font-medium">{`${String(Math.floor(elapsedTime / 60)).padStart(2, '0')}m ${String(elapsedTime % 60).padStart(2, '0')}s`}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 border-t border-white/10 pt-4">
                    <p className="text-gray-400 text-sm">{selectedLog ? new Date(selectedLog.createdAt).toLocaleDateString() : 'Today'}, {selectedLog ? new Date(selectedLog.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <p className="text-[#4ADE80] font-bold text-sm capitalize">{selectedLog?.status || 'Completed'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* AI Summary Block - Now integrated into main view */}
                  {callSummary && (
                    <div className="bg-[#1EA7FF]/5 border border-[#1EA7FF]/15 rounded-3xl p-6 relative overflow-hidden group animate-in slide-in-from-right-4 duration-500">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileText className="w-20 h-20 text-[#1EA7FF]" />
                      </div>
                      <h4 className="text-xs font-bold text-[#1EA7FF] mb-3 flex items-center gap-2 uppercase tracking-widest">
                        <FileText className="w-3.5 h-3.5" />
                        AI Analysis Result
                      </h4>
                      <p className="text-sm text-gray-200 leading-relaxed relative z-10">
                        {callSummary}
                      </p>
                    </div>
                  )}

                  {/* Recording Playback Card */}
                  <div className="bg-white/[0.03] border border-white/15 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl relative">
                    <div className="flex items-center gap-2 mb-4 text-gray-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <span className="text-sm font-medium">Recording Playback</span>
                    </div>

                    {/* Progress Row */}
                    <div className="flex items-center gap-3 mb-4">
                      <button onClick={togglePlayback} className="w-10 h-10 rounded-full bg-[url(/images/icon-bg.webp)] bg-cover bg-center flex shrink-0 items-center justify-center text-[#1EA7FF] shadow-[0_0_15px_rgba(30,167,255,0.4)] hover:scale-105 transition-transform cursor-pointer">
                        {isPlayingRecording ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
                      </button>
                      <span className="text-xs font-medium text-white/50 shrink-0">{formatTime(playbackTime)}</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full relative cursor-pointer overflow-hidden" onClick={(e) => {
                        if (audioRef.current && playbackDuration > 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = (e.clientX - rect.left) / rect.width;
                          audioRef.current.currentTime = pct * playbackDuration;
                          setPlaybackTime(pct * playbackDuration);
                        }
                      }}>
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#1EA7FF] to-[#3FD2FF] rounded-full" style={{width: playbackDuration > 0 ? `${(playbackTime / playbackDuration) * 100}%` : '0%'}} />
                      </div>
                      <span className="text-xs font-medium text-white/50 shrink-0">{playbackDuration > 0 ? formatTime(playbackDuration) : formatTime(elapsedTime)}</span>
                      <button onClick={handleDownloadAudio} className="flex items-center gap-1.5 border border-white/15 px-4 py-1.5 rounded-full bg-black/30 hover:bg-white/5 transition-all text-white text-xs font-medium cursor-pointer shrink-0">
                        <Download className="w-3.5 h-3.5 text-gray-400" /> Download Audio
                      </button>
                    </div>

                    {/* Waveform Track */}
                    <div className="bg-transparent border border-white/10 rounded-full h-11 px-6 flex items-center justify-between gap-[1px] overflow-hidden">
                      {[...Array(150)].map((_, i) => {
                        const playedRatio = playbackDuration > 0 ? playbackTime / playbackDuration : 0;
                        const played = i < Math.floor(playedRatio * 150);
                        const heights = [20,35,55,40,60,30,70,45,80,50,65,35,75,55,40,60,30,70,45,55,40,60,35,75,55,40,60,30,70,45,55,40,60,35,75,55,40,60,30,70,45,55,40,60,35,75,55,40,60,30,70,45,55,40,60,35,75,55,40,60,30,70,45,55,40,60,35,75,55,40,60,30,70,45,55,40,60,35,75,55,40,60,30,70,45,55];
                        const h = heights[i % heights.length];
                        return (
                          <div
                            key={i}
                            className={`w-[2px] min-h-[4px] rounded-full flex-shrink-0 transition-all ${played ? 'bg-[#1EA7FF]' : 'bg-white/20'}`}
                            style={{ height: `${h}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Transcription Section */}
              <div className="completed-anim-item">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-white text-sm font-medium">Full Transcription</p>
                  <button
                    onClick={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    {isTranscriptionExpanded ? 'Collapse' : 'Expand'}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isTranscriptionExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  {callTranscript ? (
                    callTranscript.split('\n').filter(l => l.trim()).slice(0, isTranscriptionExpanded ? undefined : 3).map((line, i) => {
                      const isUser = line.toLowerCase().startsWith('user:') || line.toLowerCase().startsWith('customer:');
                      const cleanLine = line.replace(/^(User|Customer|Assistant|Ryvon):\s*/i, '');
                      const speakerName = isUser ? (currentContactName || 'Caller') : 'AI Assistant';
                      const timestamp = `00:${String(i * 6 + 5).padStart(2, '0')}`;
                      return (
                        <div key={i} className="flex items-start gap-3 bg-transparent border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors">
                          <div className="flex flex-col items-center shrink-0 gap-1">
                            <div className="w-9 h-9 rounded-full bg-[url(/images/icon-bg.webp)] bg-cover bg-center flex items-center justify-center border border-white/10">
                              <img src="/images/dp.svg" className="w-4 h-4" alt="Speaker" />
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">{timestamp}</span>
                          </div>
                          <div className="pt-0.5 flex-1 min-w-0">
                            <p className="text-xs text-gray-400 font-semibold mb-1">{speakerName}</p>
                            <p className="text-sm text-gray-200 leading-relaxed">{cleanLine}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <div className="flex items-start gap-3 bg-transparent border border-white/10 rounded-2xl p-4">
                        <div className="flex flex-col items-center shrink-0 gap-1">
                          <div className="w-9 h-9 rounded-full bg-[url(/images/icon-bg.webp)] bg-cover bg-center flex items-center justify-center border border-white/10">
                            <img src="/images/dp.svg" className="w-4 h-4" alt="Speaker" />
                          </div>
                          <span className="text-[10px] text-gray-500 font-medium">00:05</span>
                        </div>
                        <div className="pt-0.5 flex-1">
                          <p className="text-xs text-gray-400 font-semibold mb-1">AI Assistant</p>
                          <p className="text-sm text-gray-200 leading-relaxed">Hello, this is your AI assistant. How can I help you today?</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Export & Share Options */}
              <div className="completed-anim-item">
                <p className="text-white text-sm font-medium mb-3">Export & Share Options</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button onClick={downloadReport} className="bg-gradient-to-br from-[#1EA7FF]/25 via-[#1EA7FF]/5 to-transparent border border-white/15 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#1EA7FF]/50 hover:bg-[#1EA7FF]/15 transition-all group cursor-pointer shadow-[0_4px_25px_rgba(30,167,255,0.1)]">
                    <div className="w-16 h-16 rounded-full bg-[url(/images/icon-bg.webp)] bg-cover bg-center border border-white/10 group-hover:shadow-[0_0_20px_rgba(30,167,255,0.4)] flex items-center justify-center transition-all relative overflow-hidden">
                      <div className="absolute inset-0 bg-[#1EA7FF]/5 group-hover:bg-[#1EA7FF]/10 transition-colors" />
                      <img src="/images/export.svg" className="w-7 h-7 relative z-10" alt="Export" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-white mb-0.5">Export as PDF</h4>
                      <p className="text-[11px] text-gray-500">Summary & Transcription</p>
                    </div>
                  </button>
                  <button onClick={handleDownloadAudio} className="bg-gradient-to-br from-[#1EA7FF]/25 via-[#1EA7FF]/5 to-transparent border border-white/15 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#1EA7FF]/50 hover:bg-[#1EA7FF]/15 transition-all group cursor-pointer shadow-[0_4px_25px_rgba(30,167,255,0.1)]">
                    <div className="w-16 h-16 rounded-full bg-[url(/images/icon-bg.webp)] bg-cover bg-center border border-white/10 group-hover:shadow-[0_0_20px_rgba(30,167,255,0.4)] flex items-center justify-center transition-all relative overflow-hidden">
                      <div className="absolute inset-0 bg-[#1EA7FF]/5 group-hover:bg-[#1EA7FF]/10 transition-colors" />
                      <img src="/images/audio.svg" className="w-7 h-7 relative z-10" alt="Audio" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-white mb-0.5">Download Audio</h4>
                      <p className="text-[11px] text-gray-500">MP3 Format</p>
                    </div>
                  </button>
                  <button onClick={handleShareSummary} className="bg-gradient-to-br from-[#1EA7FF]/25 via-[#1EA7FF]/5 to-transparent border border-white/15 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#1EA7FF]/50 hover:bg-[#1EA7FF]/15 transition-all group cursor-pointer shadow-[0_4px_25px_rgba(30,167,255,0.1)]">
                    <div className="w-16 h-16 rounded-full bg-[url(/images/icon-bg.webp)] bg-cover bg-center border border-white/10 group-hover:shadow-[0_0_20px_rgba(30,167,255,0.4)] flex items-center justify-center transition-all relative overflow-hidden">
                      <div className="absolute inset-0 bg-[#1EA7FF]/5 group-hover:bg-[#1EA7FF]/10 transition-colors" />
                      <img src="/images/share.svg" className="w-7 h-7 relative z-10" alt="Share" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-white mb-0.5">Share Summary</h4>
                      <p className="text-[11px] text-gray-500">Email or Link</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <ComingSoonModal 
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Scheduling Feature Coming Soon"
        description="We're working on bringing advanced scheduling capabilities to Ryon. Enable real-world interactions powered by AI."
        featureName="Call Scheduling"
        iconPath="/images/schedule-cs.svg"
      />
    </div>
  );
}