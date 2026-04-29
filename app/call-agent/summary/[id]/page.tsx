import { notFound } from 'next/navigation';
import Link from 'next/link';
import { XCircle, FileText, Phone, UserIcon, Play } from 'lucide-react';
import { getCallLogById } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export default async function CallSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    notFound();
  }

  const log = await getCallLogById({ id });
  
  if (!log || log.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#0c1a2b] p-4">
      <div className="relative w-full max-w-3xl bg-[#0c1a2b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1EA7FF]/20 flex items-center justify-center text-[#1EA7FF]">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{log.phoneNumber}</h3>
              <p className="text-xs text-gray-500">
                {new Date(log.createdAt).toLocaleString()} • {log.status}
              </p>
            </div>
          </div>
          <Link
            href="/call-agent"
            className="p-2 text-gray-400 hover:text-white transition-colors block"
          >
            <XCircle className="w-6 h-6" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Status</span>
              <span className={`text-sm font-semibold ${log.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>{log.status}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Duration</span>
              <span className="text-sm font-semibold text-white">{log.duration || 'N/A'}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Region</span>
              <span className="text-sm font-semibold text-white">International</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Recording</span>
              <div className="mt-1">
                {log.recordingUrl ? (
                  <a href={log.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-[#1EA7FF] hover:underline text-xs flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" /> Listen
                  </a>
                ) : (
                  <span className="text-gray-600 text-xs italic">No audio</span>
                )}
              </div>
            </div>
          </div>
          {/* AI Summary */}
          {log.summary && (
            <div className="bg-[#1EA7FF]/5 border border-[#1EA7FF]/10 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText className="w-16 h-16 text-[#1EA7FF]" />
              </div>
              <h4 className="text-sm font-bold text-[#1EA7FF] mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> AI AGENT SUMMARY
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed relative z-10">{log.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
