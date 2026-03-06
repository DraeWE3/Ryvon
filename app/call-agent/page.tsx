'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
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
  Plus
} from 'lucide-react';

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

const DEFAULT_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '';

export default function AICallAgent() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Single Call State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [isProcessing, setIsProcessing] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'in-call' | 'completed' | 'failed'>('idle');
  const [callProgress, setCallProgress] = useState(0);
  const [callId, setCallId] = useState<string | null>(null);
  const [callSummary, setCallSummary] = useState<string | null>(null);
  const [callTranscript, setCallTranscript] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Configuration State
  const [assistantId, setAssistantId] = useState('50987159-147b-46d8-b5ec-9b530c673dd4'); // Default to Nova
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Batch Processing State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'recent'>('manual');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeTab === 'recent') {
      fetchRecentCalls();
    }
  }, [activeTab]);

  const fetchRecentCalls = async () => {
    try {
      const response = await fetch('/api/call/logs');
      const data = await response.json();
      if (data.success) {
        setRecentCalls(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch recent calls:', error);
    }
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

  const handleStartCall = async () => {
    setErrorMessage('');

    if (!phoneNumber) {
      setErrorMessage('Please enter a phone number');
      return;
    }

    const region = phoneRegions.find(r => r.code === selectedRegion);
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    if (region && cleanedNumber.length !== region.digits) {
      setErrorMessage(`Please enter a valid ${region.name} phone number (${region.digits} digits required)`);
      return;
    }

    setIsProcessing(true);
    setCallStatus('calling');
    setCallProgress(10);

    try {
      const fullPhoneNumber = `${region?.dialCode}${cleanedNumber}`;

      console.log('Initiating VAPI call to:', { fullPhoneNumber, assistantId, language, customPrompt });

      const response = await fetch('/api/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
          assistantId: assistantId,
          language: language,
          customPrompt: customPrompt,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      console.log('VAPI call initiated:', data.callId);

      setCallId(data.callId);
      setCallProgress(30);
      setCallStatus('in-call');

      pollCallStatus(data.callId);
    } catch (error) {
      console.error('Call error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start call');
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

  const startBatchCalls = async () => {
    if (contacts.length === 0) return;
    setIsBatchProcessing(true);
    
    for (let i = 0; i < contacts.length; i++) {
      if (contacts[i].status !== 'pending') continue;
      
      setCurrentBatchIndex(i);
      setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'calling' } : c));
      
      try {
        const response = await fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: contacts[i].number.startsWith('+') ? contacts[i].number : `+${contacts[i].number}`,
            assistantId,
            language,
            customPrompt
          }),
        });

        const data = await response.json();
        if (data.success) {
          // In a real scenario, we'd poll status here too, or let it run async
          // For now, let's mark as completed once initiated for simplicity in batch view
          setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'completed' } : c));
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
    const csv = Papa.unparse(contacts.map(c => ({
      Name: c.name,
      Number: c.number,
      Status: c.status
    })));
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `call_report_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pollCallStatus = (id: string) => {
    let pollCount = 0;
    const maxPolls = 300;

    const interval = setInterval(async () => {
      pollCount++;

      try {
        const response = await fetch(`/api/call?callId=${id}`);
        const data = await response.json();

        console.log('Call status:', data.status);

        setCallProgress(prev => Math.min(prev + 2, 95));

        if (data.status === 'completed' || data.status === 'ended') {
          setCallProgress(100);
          setCallStatus('completed');
          setCallSummary(data.summary || null);
          setCallTranscript(data.transcript || null);
          setIsProcessing(false);
          clearInterval(interval);
        } else if (data.status === 'failed' || data.status === 'error') {
          setCallStatus('failed');
          setIsProcessing(false);
          setErrorMessage('Call failed');
          clearInterval(interval);
        }

        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setCallStatus('completed');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    }, 2000);
  };

  const handleReset = () => {
    setCallStatus('idle');
    setCallProgress(0);
    setIsProcessing(false);
    setCallId(null);
    setCallSummary(null);
    setCallTranscript(null);
    setErrorMessage('');
    setPhoneNumber('');
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
    <div className="min-h-screen agent-bg font-motive">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Mobile Sidebar */}
      <div
        id="mobile-sidebar"
        className={`fixed top-0 right-0 h-full w-64 bg-black/90 backdrop-blur-xl border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Close Button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Sidebar Content */}
          <div className="mt-12 space-y-4">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm font-medium text-white">
                <span>RyvonAI v1.0</span>
                <div className="w-3 h-3 border-r-2 border-b-2 border-gray-400 transform rotate-45 -mt-1"></div>
              </div>
            </div>

            <button className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/5 rounded-lg transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">Settings</span>
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/5 rounded-lg transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-sm font-medium">Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-screen flex flex-col p-4 sm:p-5 lg:p-6">
        <div className="max-w-6xl w-full mx-auto">
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8 sm:mb-10 gap-4">
            <div className="flex items-center gap-2">
              <SidebarToggle className="text-white" />
              <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full text-sm font-medium text-white hover:border-[#1EA7FF] hover:shadow-[0_0_20px_rgba(30,167,255,0.3)] transition-all duration-250">
                <span>RyvonAI v1.0</span>
                <div className="w-3 h-3 border-r-2 border-b-2 border-gray-400 transform rotate-45 -mt-1"></div>
              </div>
            </div>
            
            {/* Desktop Buttons */}
            <div className="hidden lg:flex gap-3">
              <button className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full text-sm font-medium text-white hover:border-[#1EA7FF] hover:shadow-[0_0_20px_rgba(30,167,255,0.3)] transition-all duration-250">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
              <button className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full text-sm font-medium text-white hover:border-[#1EA7FF] hover:shadow-[0_0_20px_rgba(30,167,255,0.3)] transition-all duration-250">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              id="mobile-menu-button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full text-white hover:border-[#1EA7FF] hover:shadow-[0_0_20px_rgba(30,167,255,0.3)] transition-all duration-250"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Header Section */}
          <header className="text-center mb-8 sm:mb-10">
            <div className="mb-6">
              <img 
                src="/images/call-header.png" 
                alt="RyvonAI Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full"
                style={{
                  mixBlendMode: 'luminosity',
                  filter: 'drop-shadow(0 0 30px rgba(30, 167, 255, 0.6)) drop-shadow(0 0 60px rgba(63, 210, 255, 0.4))'
                }}
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-gate">Make A New Call</h1>
          </header>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 backdrop-blur-xl">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-500 mb-1">Error</h4>
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Main Glass Card */}
          <div className="bg-black/5 border border-white/10 rounded-2xl p-6 sm:p-8 lg:p-10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_80px_rgba(30,167,255,0.15)] mb-10">
            
            {/* Assistant Configuration */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#1EA7FF]" />
                  Assistant Configuration
                </h2>
                <button 
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-xs text-[#1EA7FF] hover:underline"
                >
                  {showConfig ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">AI Assistant</label>
                    <div className="relative">
                      <select
                        value={assistantId}
                        onChange={(e) => setAssistantId(e.target.value)}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1EA7FF] transition-all appearance-none"
                      >
                        <optgroup label="🧠 STRATEGIC / CONSULTING">
                          <option value="50987159-147b-46d8-b5ec-9b530c673dd4">Nova – Strategic Thinker</option>
                        </optgroup>
                        <optgroup label="🚀 INNOVATION / STARTUPS">
                          <option value="18194cf4-098c-42bf-a946-44d37778ee60">Volt – High-Energy Innovator</option>
                        </optgroup>
                        <optgroup label="💛 EMOTIONAL SUPPORT / COMPANION">
                          <option value="e89a0574-bd89-4b92-8756-7cbfaf71af57">Luna – Empathetic Companion</option>
                        </optgroup>
                        <optgroup label="💘 ROMANTIC COMPANIONS (PG‑13)">
                          <option value="68bbe188-ce61-4b19-b972-9b0b4ee1ad4d">Aria – Romantic Companion (Feminine)</option>
                          <option value="9d49944e-5bc9-41e8-afdf-f7e1e08c6671">Leo – Masculine Romantic Energy</option>
                        </optgroup>
                        <optgroup label="💰 SALES">
                          <option value="f9e1b757-1d72-4f74-b896-b566bc3ea991">Rex – The Closer</option>
                          <option value="43822dff-c0f9-43f9-8ef2-e4ceb29ccad3">Nina – Retention Specialist</option>
                        </optgroup>
                        <optgroup label="🎧 CUSTOMER CARE">
                          <option value="4386a7ff-1418-49d7-95b5-94413f1353a6">Iris – Support Pro</option>
                        </optgroup>
                        <optgroup label="🏢 RECEPTION / FRONT DESK">
                          <option value="296d9f7b-3c31-4f53-b7dc-f49d97fd6069">Clara – Professional Receptionist</option>
                          <option value="a348e677-8905-4a9a-92e5-aa525f94998a">Celeste – Luxury Concierge</option>
                        </optgroup>
                        <optgroup label="🧘 THERAPY / WELLNESS">
                          <option value="573193c7-7a5c-4d7d-bd26-efc683478c1b">Dr. Vale – Therapist Style</option>
                        </optgroup>
                        <optgroup label="💳 FINANCE / COLLECTIONS">
                          <option value="705d8530-b1f1-4312-8340-08082eb89dda">Grant – Collections Agent</option>
                        </optgroup>
                        <option value="custom">Custom ID...</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                    {assistantId === 'custom' && (
                      <input
                        type="text"
                        placeholder="Enter Vapi Assistant ID"
                        className="w-full mt-2 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1EA7FF]"
                        onChange={(e) => setAssistantId(e.target.value)}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Language</label>
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => setLanguage('en')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                          language === 'en' ? 'bg-[#1EA7FF] text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        English
                      </button>
                      <button
                        onClick={() => setLanguage('hi')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                          language === 'hi' ? 'bg-[#1EA7FF] text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        Hindi (हिन्दी)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Custom System Prompt</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={promptDescription}
                        onChange={(e) => setPromptDescription(e.target.value)}
                        placeholder="e.g. Real estate agent for Ryvon"
                        className="w-32 sm:w-48 px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-[10px] text-white outline-none focus:border-[#1EA7FF] transition-all"
                      />
                      <button
                        onClick={handleGeneratePrompt}
                        disabled={isGeneratingPrompt || !promptDescription}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#1EA7FF]/10 hover:bg-[#1EA7FF]/20 border border-[#1EA7FF]/30 rounded-lg text-[10px] font-bold text-[#1EA7FF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingPrompt ? (
                          <div className="w-3 h-3 border-2 border-[#1EA7FF] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        Generate
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[120px] relative">
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g. You are a friendly sales agent for Ryvon AI. Your goal is to..."
                      className="w-full h-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#1EA7FF] resize-none pb-8"
                    />
                    <div className="absolute bottom-2 right-3 text-[10px] text-gray-500">
                      {customPrompt.length} characters
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px bg-white/5 mb-10"></div>

            {/* Contact Selection */}
            <section className="mb-8">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Contact Selection</h2>
              
              {/* Segmented Control */}
              <div className="inline-flex flex-col sm:flex-row bg-black/40 border border-white/10 rounded-[5rem] p-1 gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`px-6 py-2.5 rounded-[5rem] text-sm font-medium transition-all duration-250 ${
                    activeTab === 'manual'
                      ? 'bg-gradient-to-br from-[#1EA7FF] to-[#3FD2FF] text-white shadow-[0_4px_12px_rgba(30,167,255,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Manual Input
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className={`px-6 py-2.5 rounded-[5rem] text-sm font-medium transition-all duration-250 ${
                    activeTab === 'import'
                      ? 'bg-gradient-to-br from-[#1EA7FF] to-[#3FD2FF] text-white shadow-[0_4px_12px_rgba(30,167,255,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Import List
                </button>
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`px-6 py-2.5 rounded-[5rem] text-sm font-medium transition-all duration-250 ${
                    activeTab === 'recent'
                      ? 'bg-gradient-to-br from-[#1EA7FF] to-[#3FD2FF] text-white shadow-[0_4px_12px_rgba(30,167,255,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Recent Contacts
                </button>
              </div>

              {/* Manual Input Tab */}
              {activeTab === 'manual' && (
                <div className="mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Phone Number Input Section */}
                    <div className="bg-[#05111e]/40 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-5">
                        Phone Number <span className="text-red-500">*</span>
                      </h3>

                      {/* Country/Region Selector */}
                      <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Country/Region</label>
                        <select
                          value={selectedRegion}
                          onChange={(e) => {
                            setSelectedRegion(e.target.value);
                            setPhoneNumber('');
                          }}
                          disabled={callStatus !== 'idle'}
                          className="w-full px-4 py-3.5 bg-[#05111e]/60 border border-white/10 rounded-full text-white text-sm font-medium cursor-pointer hover:border-white/20 hover:bg-[#05111e]/80 transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {phoneRegions.map((region) => (
                            <option key={region.code} value={region.code}>
                              {region.flag} {region.name} ({region.dialCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Phone Number Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Number</label>
                        <div className="flex items-center bg-[#05111e]/60 border border-white/10 rounded-full overflow-hidden transition-all duration-250 focus-within:border-[#1EA7FF] focus-within:shadow-[0_0_20px_rgba(30,167,255,0.2)] focus-within:bg-[#05111e]/80">
                          <span className="px-4 py-3.5 bg-white/5 text-gray-400 text-sm font-semibold border-r border-white/10">
                            {currentRegion?.dialCode}
                          </span>
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value, selectedRegion))}
                            placeholder={currentRegion?.placeholder}
                            disabled={callStatus !== 'idle'}
                            className="flex-1 px-4 py-3.5 bg-transparent text-white text-sm outline-none placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Enter the complete phone number with area code</span>
                        </div>
                      </div>
                    </div>

                    {/* Call Status Panel */}
                    <div className="bg-[#05111e]/40 border border-white/10 rounded-2xl p-6 flex flex-col">
                      <h3 className="text-lg font-semibold text-white mb-6">Call Status</h3>

                      {/* Status Indicator */}
                      <div className="flex flex-col items-center justify-center py-8 mb-6">
                        {callStatus === 'idle' && (
                          <>
                            <div className="w-24 h-24 rounded-full bg-[#1EA7FF]/10 border-2 border-[#1EA7FF]/30 flex items-center justify-center mb-5">
                              <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <p className="text-base text-gray-400 font-medium">Ready to initiate call</p>
                          </>
                        )}

                        {callStatus === 'calling' && (
                          <>
                            <div className="w-24 h-24 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center mb-5 animate-pulse">
                              <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <p className="text-base font-medium text-white mb-1">Connecting...</p>
                            <p className="text-xs text-gray-400">Dialing {getFullPhoneNumber()}</p>
                          </>
                        )}

                        {callStatus === 'in-call' && (
                          <>
                            <div className="relative w-24 h-24 mb-5">
                              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                              <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                              </div>
                            </div>
                            <p className="text-base font-medium text-green-400 mb-1">Call in Progress</p>
                            <p className="text-xs text-gray-400">Ryvon is handling the call</p>
                          </>
                        )}

                        {callStatus === 'completed' && (
                          <>
                            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-5">
                              <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-base font-medium text-white mb-1">Call Completed</p>
                            <p className="text-xs text-gray-400">Successfully delivered pitch</p>
                          </>
                        )}

                        {callStatus === 'failed' && (
                          <>
                            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-5">
                              <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                            <p className="text-base font-medium text-white mb-1">Call Failed</p>
                            <p className="text-xs text-gray-400">Please try again</p>
                          </>
                        )}
                      </div>

                      {/* Progress Bar for in-call and calling */}
                      {(callStatus === 'calling' || callStatus === 'in-call') && (
                        <div className="mb-6">
                          <div className="flex justify-between text-xs text-gray-400 mb-2">
                            <span>Progress</span>
                            <span>{callProgress}%</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ease-out ${
                                callStatus === 'in-call' ? 'bg-green-500' : 'bg-[#1EA7FF]'
                              }`}
                              style={{ width: `${callProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Call Progress Steps for in-call */}
                      {callStatus === 'in-call' && (
                        <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 animate-pulse flex-shrink-0"></div>
                            <p className="text-xs text-gray-400">Greeting customer</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 animate-pulse flex-shrink-0"></div>
                            <p className="text-xs text-gray-400">Delivering pitch</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-gray-600 rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-xs text-gray-600">Handling questions</p>
                          </div>
                        </div>
                      )}

                      {/* Call Details for completed */}
                      {callStatus === 'completed' && callId && (
                        <div className="space-y-4 mb-6">
                          <div className="bg-green-500/10 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Status</span>
                              <span className="font-medium text-green-400">Success</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Call ID</span>
                              <span className="font-medium text-white">{callId.slice(0, 8)}...</span>
                            </div>
                          </div>

                          {(callSummary || callTranscript) && (
                            <div className="grid grid-cols-2 gap-3">
                              {callSummary && (
                                <button 
                                  onClick={() => {
                                    const blob = new Blob([callSummary], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `summary_${callId.slice(0, 8)}.txt`;
                                    link.click();
                                  }}
                                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white hover:bg-white/10 transition-all"
                                >
                                  <FileText className="w-4 h-4 text-[#1EA7FF]" />
                                  Summary
                                </button>
                              )}
                              {callTranscript && (
                                <button 
                                  onClick={() => {
                                    const blob = new Blob([callTranscript], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `transcript_${callId.slice(0, 8)}.txt`;
                                    link.click();
                                  }}
                                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white hover:bg-white/10 transition-all"
                                >
                                  <MessageSquare className="w-4 h-4 text-[#1EA7FF]" />
                                  Transcript
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* How It Works */}
                      <div className="bg-[#05172a]/60 border border-[#1EA7FF]/20 rounded-xl p-5">
                        <div className="flex items-center gap-2.5 mb-4">
                          <svg className="w-5 h-5 text-[#1EA7FF]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <h4 className="text-sm font-semibold text-[#1EA7FF]">How It Works</h4>
                        </div>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2 text-xs text-[#3FD2FF]">
                            <span className="text-[#1EA7FF] font-bold">•</span>
                            <span>Enter any valid phone number</span>
                          </li>
                          <li className="flex items-start gap-2 text-xs text-[#3FD2FF]">
                            <span className="text-[#1EA7FF] font-bold">•</span>
                            <span>Ryvon AI handles the conversation</span>
                          </li>
                          <li className="flex items-start gap-2 text-xs text-[#3FD2FF]">
                            <span className="text-[#1EA7FF] font-bold">•</span>
                            <span>Professional product pitching</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8">
                    {callStatus === 'idle' && (
                      <button
                        onClick={handleStartCall}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-[#1EA7FF] to-[#3FD2FF] rounded-full text-base font-semibold text-white cursor-pointer transition-all duration-250 shadow-[0_8px_24px_rgba(30,167,255,0.4)] hover:shadow-[0_12px_32px_rgba(30,167,255,0.6)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>Start AI Call</span>
                      </button>
                    )}

                    {callStatus === 'completed' && (
                      <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full text-base font-semibold text-white cursor-pointer transition-all duration-250 hover:border-[#1EA7FF] hover:shadow-[0_0_25px_rgba(30,167,255,0.3)]"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Make Another Call</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Import List Tab */}
              {activeTab === 'import' && (
                <div className="mt-6 space-y-6">
                  {/* Upload Area */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-[#1EA7FF]/50 hover:bg-[#1EA7FF]/5 transition-all group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept=".csv" 
                      className="hidden" 
                    />
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#1EA7FF]" />
                    </div>
                    <h3 className="text-white font-medium mb-1">Upload CSV File</h3>
                    <p className="text-gray-500 text-sm">Drag and drop or click to browse</p>
                    <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest">Supports Name, Phone columns</p>
                  </div>

                  {contacts.length > 0 && (
                    <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-4">
                          <h3 className="text-sm font-semibold text-white">Imported Contacts</h3>
                          <span className="px-2 py-0.5 rounded-full bg-[#1EA7FF]/20 text-[#1EA7FF] text-[10px] font-bold">
                            {contacts.length} Selected
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setContacts([])}
                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                            title="Clear List"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {!isBatchProcessing ? (
                            <button 
                              onClick={startBatchCalls}
                              className="flex items-center gap-2 px-4 py-2 bg-[#1EA7FF] rounded-lg text-xs font-bold text-white shadow-lg shadow-[#1EA7FF]/20 hover:scale-105 transition-all"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Start Batch
                            </button>
                          ) : (
                            <button 
                              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 rounded-lg text-xs font-bold text-black cursor-wait"
                            >
                              <Pause className="w-3 h-3 fill-current" />
                              Processing...
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto">
                        <table className="w-full text-left">
                          <thead className="sticky top-0 bg-[#111] z-10 border-b border-white/5">
                            <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                              <th className="px-6 py-3 font-medium">Name</th>
                              <th className="px-6 py-3 font-medium">Phone Number</th>
                              <th className="px-6 py-3 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {contacts.map((contact, idx) => (
                              <tr key={contact.id} className={`${idx === currentBatchIndex ? 'bg-[#1EA7FF]/10' : ''} transition-colors`}>
                                <td className="px-6 py-4 text-sm text-white font-medium">{contact.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-400">+{contact.number}</td>
                                <td className="px-6 py-4">
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

                      {contacts.some(c => c.status === 'completed') && (
                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                          <button 
                            onClick={downloadReport}
                            className="flex items-center gap-2 text-xs font-medium text-[#1EA7FF] hover:text-[#3FD2FF] transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download Batch Report
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Contacts Tab */}
              {activeTab === 'recent' && (
                <div className="mt-6">
                  {recentCalls.length === 0 ? (
                    <div className="py-20 text-center">
                      <Clock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400 text-sm">Your recent call history will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentCalls.map((log) => (
                        <div 
                          key={log.id} 
                          className="bg-black/40 border border-white/10 rounded-2xl p-5 hover:border-[#1EA7FF]/30 transition-all group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#1EA7FF]">
                                <Phone className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-white font-medium">{log.phoneNumber}</h4>
                                <p className="text-xs text-gray-500">
                                  {new Date(log.createdAt).toLocaleString()} • {log.status}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {log.summary && (
                                <button 
                                  onClick={() => {
                                    const blob = new Blob([log.summary], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `summary_${log.phoneNumber}_${log.id.slice(0, 8)}.txt`;
                                    a.click();
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Summary
                                </button>
                              )}
                              {log.recordingUrl && (
                                <a 
                                  href={log.recordingUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  Recording
                                </a>
                              )}
                              <button 
                                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                                title="Delete Log"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {(log.transcript || log.summary) && (
                            <div className="mt-4 pt-4 border-t border-white/5 hidden group-hover:block transition-all">
                              {log.summary && (
                                <div className="mb-3">
                                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Summary</span>
                                  <p className="text-xs text-gray-400 line-clamp-2">{log.summary}</p>
                                </div>
                              )}
                              {log.transcript && (
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Latest Transcript</span>
                                  <p className="text-[10px] text-gray-600 italic line-clamp-1">"{log.transcript.slice(-100)}..."</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}