'use client'
import React, { useState } from 'react';
import { Play, Save, Trash2, Zap, Phone, Database, CheckCircle, XCircle, Clock, AlertCircle, Upload, X, FileSpreadsheet, Mail, PhoneCall, AlertTriangle, CheckCheck, Info, Loader2, Timer, Rocket, FileText, Send } from 'lucide-react';
import Image from 'next/image';

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: string;
}

interface Lead {
  name: string;
  phone: string;
  email: string;
  countryCode: string;
  status: 'pending' | 'calling' | 'completed' | 'failed' | 'invalid' | 'email-sent';
  callTranscript?: string;
  callSummary?: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  configured: boolean;
  data?: any;
}

interface Stats {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
}

const WorkflowBuilder = () => {
  const [workflowName, setWorkflowName] = useState('Lead Auto-Caller');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [draggedNodeType, setDraggedNodeType] = useState<any>(null);
  const [connections, setConnections] = useState<Array<{from: string, to: string}>>([]);
  const [showManualLeadModal, setShowManualLeadModal] = useState(false);
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [emailConfig, setEmailConfig] = useState({
    senderEmail: '',
    senderName: ''
  });
  const [manualLead, setManualLead] = useState({
    name: '',
    phone: '',
    email: '',
    countryCode: '+1'
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [executionLog, setExecutionLog] = useState<LogEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: 0
  });

  const nodeTypes = {
    triggers: [
      {
        id: 'google-sheets',
        name: 'Google Sheets',
        icon: Database,
        color: 'bg-emerald-500',
        description: 'Import leads from spreadsheet'
      }
    ],
    actions: [
      {
        id: 'call-agent',
        name: 'Initiate AI Call',
        icon: Phone,
        color: 'bg-purple-500',
        description: 'Make automated AI calls'
      },
      {
        id: 'follow-up-email',
        name: 'Send Follow-up Email',
        icon: Mail,
        color: 'bg-blue-500',
        description: 'AI-generated personalized emails'
      }
    ]
  };

  const canvasRef = React.useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', icon?: React.ReactNode) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog(prev => [...prev, { message, type, timestamp }]);
  };

  const handleDragStart = (nodeType: any) => {
    setDraggedNodeType(nodeType);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: draggedNodeType.id,
      name: draggedNodeType.name,
      x,
      y,
      configured: false
    };

    setNodes(prev => {
      const updated = [...prev, newNode];
      updateConnections(updated);
      return updated;
    });
    setDraggedNodeType(null);
  };

  const updateConnections = (nodeList: WorkflowNode[]) => {
    // Sort nodes by type: triggers first, then actions in order they were added
    const triggers = nodeList.filter(n => n.type === 'google-sheets');
    const actions = nodeList.filter(n => n.type === 'call-agent' || n.type === 'follow-up-email');
    
    const newConnections: Array<{from: string, to: string}> = [];
    
    // Connect trigger to first action
    if (triggers.length > 0 && actions.length > 0) {
      newConnections.push({
        from: triggers[0].id,
        to: actions[0].id
      });
    }
    
    // Connect actions in sequence
    for (let i = 0; i < actions.length - 1; i++) {
      newConnections.push({
        from: actions[i].id,
        to: actions[i + 1].id
      });
    }
    
    setConnections(newConnections);
  };

  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNode(node);
    if (node.type === 'google-sheets') {
      setShowManualLeadModal(true);
    } else if (node.type === 'follow-up-email') {
      setShowEmailConfigModal(true);
    }
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => {
      const updated = prev.filter(n => n.id !== nodeId);
      updateConnections(updated);
      return updated;
    });
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const parseCSV = (text: string): Lead[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const nameIndex = headers.findIndex(h => h.includes('name'));
    const phoneIndex = headers.findIndex(h => h.includes('phone'));
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const countryIndex = headers.findIndex(h => h.includes('country') || h.includes('code'));

    if (nameIndex === -1 || phoneIndex === -1 || emailIndex === -1) {
      throw new Error('CSV must contain "Name", "Phone", and "Email" columns');
    }

    const parsedLeads: Lead[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length > 1 && values[nameIndex] && values[phoneIndex] && values[emailIndex]) {
        parsedLeads.push({
          name: values[nameIndex],
          phone: values[phoneIndex],
          email: values[emailIndex],
          countryCode: countryIndex !== -1 ? values[countryIndex] : '+1',
          status: 'pending'
        });
      }
    }

    return parsedLeads;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedLeads = parseCSV(text);
        
        setLeads(prev => [...prev, ...parsedLeads]);
        addLog(`Successfully imported ${parsedLeads.length} leads from ${file.name}`, 'success');
        
        if (selectedNode) {
          setNodes(nodes.map(n => 
            n.id === selectedNode.id 
              ? { ...n, configured: true, data: { leadsCount: leads.length + parsedLeads.length } }
              : n
          ));
        }
      } catch (error) {
        addLog(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleDragDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedLeads = parseCSV(text);
        
        setLeads(prev => [...prev, ...parsedLeads]);
        addLog(`Successfully imported ${parsedLeads.length} leads from ${file.name}`, 'success');
        
        if (selectedNode) {
          setNodes(nodes.map(n => 
            n.id === selectedNode.id 
              ? { ...n, configured: true, data: { leadsCount: leads.length + parsedLeads.length } }
              : n
          ));
        }
      } catch (error) {
        addLog(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const pollCallStatus = async (callId: string, currentLead: Lead): Promise<boolean> => {
    let attempts = 0;
    const maxAttempts = 60;

    return new Promise((resolve) => {
      const checkStatus = async (): Promise<void> => {
        try {
          const response = await fetch(`/api/call?callId=${callId}`);
          const data = await response.json();

          if (data.success) {
            if (data.status === 'completed' || data.status === 'ended') {
              addLog(`Call completed for ${currentLead.name}`, 'success');
              
              const transcript = data.transcript || data.messages?.map((m: any) => m.content).join('\n') || '';
              const summary = data.summary || '';
              
              setLeads(prev => prev.map(l => 
                l.name === currentLead.name && l.phone === currentLead.phone
                  ? { ...l, status: 'completed' as const, callTranscript: transcript, callSummary: summary }
                  : l
              ));
              setStats(prev => ({ ...prev, completed: prev.completed + 1, inProgress: prev.inProgress - 1 }));
              resolve(true);
              return;
            } else if (data.status === 'failed' || data.status === 'error') {
              addLog(`Call failed for ${currentLead.name}`, 'error');
              setLeads(prev => prev.map(l => 
                l.name === currentLead.name && l.phone === currentLead.phone
                  ? { ...l, status: 'failed' as const }
                  : l
              ));
              setStats(prev => ({ ...prev, failed: prev.failed + 1, inProgress: prev.inProgress - 1 }));
              resolve(false);
              return;
            }
          }

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 2000);
          } else {
            addLog(`Call status check timeout for ${currentLead.name} - marking as completed`, 'warning');
            setLeads(prev => prev.map(l => 
              l.name === currentLead.name && l.phone === currentLead.phone
                ? { ...l, status: 'completed' as const }
                : l
            ));
            setStats(prev => ({ ...prev, completed: prev.completed + 1, inProgress: prev.inProgress - 1 }));
            resolve(true);
          }
        } catch (error) {
          console.error('Status check error:', error);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 2000);
          } else {
            resolve(false);
          }
        }
      };

      setTimeout(checkStatus, 2000);
    });
  };

  const makeCall = async (currentLead: Lead): Promise<{ success: boolean; callId?: string; error?: string; transcript?: string; summary?: string }> => {
    try {
      addLog(`Dialing ${currentLead.name} at ${currentLead.countryCode}${currentLead.phone}`, 'info');
      
      const fullPhoneNumber = `${currentLead.countryCode}${currentLead.phone.replace(/\D/g, '')}`;

      const response = await fetch('/api/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
          assistantId: '',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      addLog(`Call connected - Call ID: ${data.callId}`, 'success');
      
      setLeads(prev => prev.map(l => 
        l.name === currentLead.name && l.phone === currentLead.phone
          ? { ...l, status: 'calling' as const }
          : l
      ));

      // Wait for the call to complete
      addLog(`Call in progress with ${currentLead.name}...`, 'info');
      const callCompleted = await pollCallStatus(data.callId, currentLead);

      if (callCompleted) {
        addLog(`Call with ${currentLead.name} completed successfully`, 'success');
        
        // Get the updated lead data from state
        const updatedLeadData = await new Promise<Lead | null>((resolve) => {
          setLeads(prev => {
            const lead = prev.find(l => l.name === currentLead.name && l.phone === currentLead.phone);
            resolve(lead || null);
            return prev;
          });
        });
        
        return { 
          success: true, 
          callId: data.callId,
          transcript: updatedLeadData?.callTranscript || '',
          summary: updatedLeadData?.callSummary || ''
        };
      } else {
        addLog(`Call with ${currentLead.name} did not complete successfully`, 'error');
        return { success: false, error: 'Call did not complete' };
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Call failed for ${currentLead.name}: ${errorMessage}`, 'error');
      setLeads(prev => prev.map(l => 
        l.name === currentLead.name && l.phone === currentLead.phone
          ? { ...l, status: 'failed' as const }
          : l
      ));
      return { success: false, error: errorMessage };
    }
  };

  const generateFollowUpEmail = async (leadName: string, hasCallData: boolean = false, transcript?: string, summary?: string): Promise<string> => {
    try {
      let prompt = '';
      
      if (hasCallData) {
        // Email after call - personalized based on conversation
        prompt = `Generate a professional follow-up email based on this sales call:

Lead Name: ${leadName}
Call Summary: ${summary || 'Sales call completed successfully'}
Call Transcript: ${transcript || 'N/A'}

Create a personalized follow-up email that:
1. Thanks them for their time on the call
2. Summarizes key points discussed
3. Addresses any concerns or questions they had
4. Includes a clear call-to-action
5. Keep it professional but warm and conversational
6. Length: 150-250 words

Email:`;
      } else {
        // Cold email - no call data
        prompt = `Generate a professional cold outreach email for a sales prospect:

Lead Name: ${leadName}

Create a compelling cold email that:
1. Has an attention-grabbing opening
2. Briefly introduces your company/service value proposition
3. Addresses a common pain point or opportunity
4. Includes a clear call-to-action (e.g., schedule a call, demo)
5. Keep it professional, concise, and not overly salesy
6. Length: 120-180 words

Email:`;
      }

      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          leadName
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate email');
      }
      
      return data.emailContent;
    } catch (error) {
      console.error('Error generating email:', error);
      throw new Error('Failed to generate email content');
    }
  };

  const sendFollowUpEmail = async (currentLead: Lead, hasCallData: boolean = false, transcript?: string, summary?: string): Promise<void> => {
    try {
      const emailType = hasCallData ? 'follow-up' : 'outreach';
      addLog(`Generating ${emailType} email for ${currentLead.name}`, 'info');
      
      const emailContent = await generateFollowUpEmail(currentLead.name, hasCallData, transcript, summary);
      
      addLog(`Sending email to ${currentLead.email}`, 'info');

      const emailSubject = hasCallData 
        ? `Follow-up from Our Conversation - ${currentLead.name}`
        : `Quick Question for ${currentLead.name}`;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: currentLead.email,
          toName: currentLead.name,
          from: emailConfig.senderEmail,
          fromName: emailConfig.senderName,
          subject: emailSubject,
          html: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2563eb;">Hi ${currentLead.name},</h2>
                  ${emailContent.split('\n').map(p => `<p>${p}</p>`).join('')}
                  <br>
                  <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    This email was sent by ${emailConfig.senderName}
                  </p>
                </div>
              </body>
            </html>
          `
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send email');
      }

      addLog(`Email sent successfully to ${currentLead.name}`, 'success');
      
      setLeads(prev => prev.map(l => 
        l.name === currentLead.name && l.phone === currentLead.phone
          ? { ...l, status: 'email-sent' as const }
          : l
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Failed to send email to ${currentLead.name}: ${errorMessage}`, 'error');
    }
  };

  const executeWorkflow = async () => {
    const hasGoogleSheets = nodes.some(n => n.type === 'google-sheets' && n.configured);
    const hasCallAgent = nodes.some(n => n.type === 'call-agent');
    const hasFollowUpEmail = nodes.some(n => n.type === 'follow-up-email' && n.configured);

    if (!hasGoogleSheets) {
      addLog('Please add and configure Google Sheets trigger first', 'error');
      return;
    }

    if (!hasCallAgent && !hasFollowUpEmail) {
      addLog('Please add at least one action (Call or Email)', 'error');
      return;
    }

    if (leads.length === 0) {
      addLog('No leads found. Please upload a CSV file or add leads manually', 'error');
      return;
    }

    // If only email action (no call), check email config
    if (!hasCallAgent && hasFollowUpEmail) {
      if (!emailConfig.senderEmail || !emailConfig.senderName) {
        addLog('Please configure email settings first', 'error');
        return;
      }
    }

    setIsExecuting(true);
    setExecutionLog([]);
    addLog('Starting workflow execution...', 'info');
    
    const pendingLeads = leads.filter(l => l.status === 'pending');
    setStats({
      total: pendingLeads.length,
      completed: 0,
      failed: 0,
      inProgress: 0
    });

    for (let i = 0; i < pendingLeads.length; i++) {
      const currentLead = pendingLeads[i];
      
      addLog(`Processing lead ${i + 1}/${pendingLeads.length}: ${currentLead.name}`, 'info');
      
      // SCENARIO 1: Both Call and Email actions
      if (hasCallAgent && hasFollowUpEmail) {
        setStats(prev => ({ ...prev, inProgress: prev.inProgress + 1 }));
        addLog(`Initiating call to ${currentLead.name}...`, 'info');
        const callResult = await makeCall(currentLead);

        if (callResult.success && currentLead.email) {
          addLog(`Call completed - proceeding to send follow-up email`, 'success');
          await sendFollowUpEmail(currentLead, true, callResult.transcript, callResult.summary);
        } else if (!callResult.success) {
          addLog(`Skipping email for ${currentLead.name} - call failed`, 'warning');
        }
      } 
      // SCENARIO 2: Only Call action (no email)
      else if (hasCallAgent && !hasFollowUpEmail) {
        setStats(prev => ({ ...prev, inProgress: prev.inProgress + 1 }));
        addLog(`Initiating call to ${currentLead.name}...`, 'info');
        await makeCall(currentLead);
      }
      // SCENARIO 3: Only Email action (no call) - Cold outreach
      else if (!hasCallAgent && hasFollowUpEmail) {
        if (currentLead.email) {
          addLog(`Sending cold outreach email to ${currentLead.name}`, 'info');
          await sendFollowUpEmail(currentLead, false);
          setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
        } else {
          addLog(`Skipping ${currentLead.name} - no email address`, 'warning');
          setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }

      // Wait before processing next lead
      if (i < pendingLeads.length - 1) {
        addLog(`Waiting 5 seconds before next lead...`, 'info');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    addLog('Workflow execution completed!', 'success');
    setIsExecuting(false);
  };

  const resetWorkflow = () => {
    setLeads(prev => prev.map(l => ({ ...l, status: 'pending' as const })));
    setExecutionLog([]);
    setStats({ total: 0, completed: 0, failed: 0, inProgress: 0 });
  };

  const addManualLead = () => {
    if (!manualLead.name || !manualLead.phone || !manualLead.email) {
      addLog('Please fill in all lead fields', 'error');
      return;
    }

    const newLead: Lead = {
      name: manualLead.name,
      phone: manualLead.phone,
      email: manualLead.email,
      countryCode: manualLead.countryCode,
      status: 'pending'
    };

    setLeads(prev => [...prev, newLead]);
    addLog(`Added lead: ${newLead.name}`, 'success');
    
    // Reset form
    setManualLead({
      name: '',
      phone: '',
      email: '',
      countryCode: '+1'
    });
  };

  const saveAndCloseManualLeads = () => {
    setShowManualLeadModal(false);
    
    // Update Google Sheets node if selected
    if (selectedNode) {
      setNodes(nodes.map(n => 
        n.id === selectedNode.id 
          ? { ...n, configured: true, data: { leadsCount: leads.length } }
          : n
      ));
    }
  };

  return (
    <div className="h-screen bg-[#0d0d0d] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#111111]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Image 
              src="/images/logo.png"
              alt="Ryvon AI" 
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <div className="h-6 w-px bg-gray-700"></div>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-400 text-sm px-2 py-1 hover:text-white focus:text-white transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => console.log('Save workflow')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={executeWorkflow}
              disabled={isExecuting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0961FF] hover:bg-[#0751D9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              {isExecuting ? 'Running...' : 'Run Workflow'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Components */}
        <div className="w-72 border-r border-gray-800 bg-[#111111] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Components</h2>
            
            <div className="mb-6">
              <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Triggers</h3>
              <div className="space-y-2">
                {nodeTypes.triggers.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] cursor-grab active:cursor-grabbing transition-colors border border-gray-800 hover:border-gray-700"
                  >
                    <div className={`${item.color} p-2 rounded-lg`}>
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">AI Actions</h3>
              <div className="space-y-2">
                {nodeTypes.actions.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] cursor-grab active:cursor-grabbing transition-colors border border-gray-800 hover:border-gray-700"
                  >
                    <div className={`${item.color} p-2 rounded-lg`}>
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col">
          <div
            ref={canvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex-1 bg-[#0d0d0d] relative"
            style={{
              backgroundImage: 'radial-gradient(circle, #1a1a1a 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          >
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Zap className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">Build Your Workflow</h3>
                  <p className="text-sm text-gray-600">Drag components from the sidebar to get started</p>
                </div>
              </div>
            )}

            {/* Render Connection Lines */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
              {connections.map((conn, idx) => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                
                if (!fromNode || !toNode) return null;
                
                // Calculate control points for curved line
                const startX = fromNode.x;
                const startY = fromNode.y + 40; // Bottom of node
                const endX = toNode.x;
                const endY = toNode.y - 40; // Top of node
                
                const midY = (startY + endY) / 2;
                
                return (
                  <g key={idx}>
                    <path
                      d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                      stroke="#0961FF"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="0"
                      className="transition-all duration-300"
                    />
                    {/* Arrow head */}
                    <polygon
                      points={`${endX},${endY} ${endX - 6},${endY - 10} ${endX + 6},${endY - 10}`}
                      fill="#0961FF"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Render Nodes */}
            {nodes.map((node) => {
              const nodeType = [...nodeTypes.triggers, ...nodeTypes.actions].find(t => t.id === node.type);
              if (!nodeType) return null;

              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`absolute cursor-pointer group ${
                    selectedNode?.id === node.id ? 'ring-2 ring-[#0961FF]' : ''
                  }`}
                  style={{
                    left: node.x,
                    top: node.y,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                >
                  <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 hover:border-gray-700 transition-all shadow-xl p-4 min-w-[200px] relative">
                    {/* Delete Button - Shows on Hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                      }}
                      className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 bg-red-500 hover:bg-red-600 rounded-full shadow-lg z-20 hover:scale-110"
                      title="Delete node"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </button>

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`${nodeType.color} p-1.5 rounded`}>
                          <nodeType.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium">{node.name}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      {node.configured ? (
                        <span className="text-[#0af071] flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Configured
                          {node.data?.leadsCount && ` (${node.data.leadsCount} leads)`}
                        </span>
                      ) : (
                        'Click to configure'
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats Bar */}
          {leads.length > 0 && (
            <div className="border-t border-gray-800 bg-[#111111] p-4">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Total: <span className="text-white font-medium">{stats.total || leads.length}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-gray-400">Completed: <span className="text-emerald-500 font-medium">{stats.completed}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-400">In Progress: <span className="text-blue-500 font-medium">{stats.inProgress}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-400">Failed: <span className="text-red-500 font-medium">{stats.failed}</span></span>
                  </div>
                </div>
                <button
                  onClick={resetWorkflow}
                  className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Execution Log */}
        <div className="w-80 border-l border-gray-800 bg-[#111111] flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Execution Log</h2>
            {executionLog.length > 0 && (
              <button
                onClick={() => setExecutionLog([])}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {executionLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-sm">No activity yet</p>
                <p className="text-xs mt-1">Configure and run workflow</p>
              </div>
            ) : (
              executionLog.map((log, index) => {
                // Determine icon based on log type
                let LogIcon = Info;
                if (log.type === 'success') LogIcon = CheckCircle;
                if (log.type === 'error') LogIcon = XCircle;
                if (log.type === 'warning') LogIcon = AlertTriangle;

                return (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded border ${
                      log.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                      log.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                      log.type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400' :
                      'bg-gray-800/50 border-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <LogIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="flex-1">{log.message}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">{log.timestamp}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Manual Lead Entry Modal */}
      {showManualLeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Leads</h2>
              <button
                onClick={() => setShowManualLeadModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CSV Upload Section */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Upload CSV File</h3>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDragDrop}
                className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-[#0961FF] transition-colors cursor-pointer"
              >
                <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-2">Drag and drop your CSV file here</p>
                <p className="text-xs text-gray-600 mb-3">or</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0961FF] hover:bg-[#0751D9] rounded-lg cursor-pointer transition-colors text-sm font-medium">
                  <FileSpreadsheet className="w-4 h-4" />
                  Browse Files
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400 mb-1">CSV Format: Name, Phone, Email, Country Code (e.g., +1, +44, +234)</p>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Or Add Leads Manually</h3>
              
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Name</label>
                    <input
                      type="text"
                      value={manualLead.name}
                      onChange={(e) => setManualLead({ ...manualLead, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0961FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={manualLead.email}
                      onChange={(e) => setManualLead({ ...manualLead, email: e.target.value })}
                      placeholder="john@company.com"
                      className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0961FF]"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Country Code</label>
                    <select
                      value={manualLead.countryCode}
                      onChange={(e) => setManualLead({ ...manualLead, countryCode: e.target.value })}
                      className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0961FF]"
                    >
                      <option value="+1">+1 (US/CA)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+234">+234 (NG)</option>
                      <option value="+91">+91 (IN)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+86">+86 (CN)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={manualLead.phone}
                      onChange={(e) => setManualLead({ ...manualLead, phone: e.target.value })}
                      placeholder="8012345678"
                      className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0961FF]"
                    />
                  </div>
                </div>

                <button
                  onClick={addManualLead}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
                >
                  <Database className="w-4 h-4" />
                  Add Lead
                </button>
              </div>

              {/* Current Leads List */}
              {leads.length > 0 && (
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-xs font-medium text-gray-400 mb-2">Current Leads ({leads.length})</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {leads.map((lead, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-[#111111] rounded border border-gray-800">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{lead.name}</p>
                          <p className="text-xs text-gray-500">{lead.countryCode}{lead.phone} • {lead.email}</p>
                        </div>
                        <button
                          onClick={() => setLeads(leads.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-gray-800 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={saveAndCloseManualLeads}
              disabled={leads.length === 0}
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-[#0961FF] hover:bg-[#0751D9] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Save & Continue ({leads.length} leads)
            </button>
          </div>
        </div>
      )}

      {/* Email Configuration Modal */}
      {showEmailConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Configure Email Settings</h2>
              <button
                onClick={() => setShowEmailConfigModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Sender Email</label>
                  <input
                    type="email"
                    value={emailConfig.senderEmail}
                    onChange={(e) => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                    placeholder="your-email@company.com"
                    className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0961FF]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Sender Name</label>
                  <input
                    type="text"
                    value={emailConfig.senderName}
                    onChange={(e) => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                    placeholder="Your Name / Company"
                    className="w-full bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0961FF]"
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-xs text-blue-400 mb-2"><strong>How it works:</strong></p>
                <ul className="text-xs text-blue-400/80 space-y-1">
                  <li>• After each successful call, GPT-4 analyzes the call transcript</li>
                  <li>• Generates a personalized follow-up email based on the conversation</li>
                  <li>• Automatically sends email to the lead's email address via Resend</li>
                  <li>• Mentions key discussion points and next steps</li>
                  <li>• SMTP and OpenAI credentials are configured server-side</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  if (selectedNode) {
                    setNodes(nodes.map(n => 
                      n.id === selectedNode.id 
                        ? { ...n, configured: true }
                        : n
                    ));
                  }
                  setShowEmailConfigModal(false);
                  addLog('Email configuration saved', 'success');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0961FF] hover:bg-[#0751D9] rounded-lg transition-colors text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowBuilder;