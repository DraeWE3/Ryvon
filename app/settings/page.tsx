"use client";

import React, { useState, useRef, useEffect } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Menu, X, Loader2, Pen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Profile");
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [timezone, setTimezone] = useState("GMT");
  const [image, setImage] = useState("/img/pfp.png");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setCompanyName(session.user.companyName || "");
      setTimezone(session.user.timezone || "GMT");
      setImage(session.user.image || "/img/pfp.png");
    }
  }, [session]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Immediate local preview
    setImage(URL.createObjectURL(file));

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      
      // The API returns an array of uploaded files when using uploadQueue in chunks
      // but if we used standard Vercel Blob from route, it returns `pathname`, `url`
      const imageUrl = Array.isArray(data) ? data[0].url : data.url;
      
      setImage(imageUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!session?.user) return;
    setIsSaving(true);
    
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, companyName, timezone, image }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      
      await update({
        name,
        email,
        companyName,
        timezone,
        image
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete all your chats.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/settings/account", {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to delete account");
      
      signOut({ callbackUrl: "/" });
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  if (!session) {
    return <div className="settings-bg flex items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  return (
    <div className="settings-bg">
      <div className="chat-top">
        <div className="flex items-center gap-3">
          <SidebarToggle className="sidebar-toggle-external text-white" />
          <div className="btn2 btn cursor-pointer desktop-only">
            <p>RyvonAI v1.0</p>
            <img src="/img/down.svg" alt="" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="right-btncon desktop-only">
            <div className="btn2 btn cursor-pointer text-white">
              <p>Configuration</p>
              <img src="/img/setting.svg" alt="" />
            </div>
          </div>
          <div className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <Menu color="white" />
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-20 flex flex-col items-center">
        <h1 className="text-white text-3xl font-motive font-bold mb-10 tracking-wide">
          Account
        </h1>

        <div className="w-full flex flex-col gap-6">
          {/* Profile Summary Card */}
          <div className="settings-glass-card p-6 flex flex-col sm:flex-row items-center sm:justify-between w-full">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <div 
                className="relative cursor-pointer group" 
                onClick={() => fileInputRef.current?.click()}
                title="Change Avatar"
              >
                <img src={image} alt="Profile" className="w-16 h-16 rounded-full border border-blue-500/30 object-cover" />
                
                {/* Always-on subtle edit indicator */}
                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-blue-600 border-2 border-[#0A0F1A] flex items-center justify-center shadow-lg">
                   <Pen className="w-2.5 h-2.5 text-white" />
                </div>
                
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                   {isUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <p className="text-[10px] text-white">Upload</p>}
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              <div className="flex flex-col">
                <h2 className="text-white text-lg font-motive font-medium">{name || "User"}</h2>
                <p className="text-gray-400 text-sm font-light">{email || "No email"}</p>
                <span className="text-blue-400 text-xs font-medium mt-1">Pro Plan</span>
              </div>
            </div>
            <button className="px-6 py-2 rounded-full border border-gray-600 text-gray-200 text-sm hover:bg-white/5 transition-colors">
              Upgrade Plan
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="settings-glass-card flex flex-col sm:flex-row p-1 sm:p-2 w-full justify-between items-center sm:h-14 overflow-x-auto gap-2 sm:gap-0">
            {['Profile', 'Security', 'Billing', 'Integrations', 'Preferences'].map((tab) => (
              <div 
                key={tab}
                className={cn("settings-tab flex items-center justify-center min-w-[120px]", activeTab === tab ? "active" : "")}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'Profile' && <img src="/img-sidebar/account.svg" className="w-4 h-4 mr-2 opacity-70" alt="" />}
                {tab === 'Security' && <svg className="w-4 h-4 mr-2 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>}
                {tab === 'Billing' && <svg className="w-4 h-4 mr-2 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>}
                {tab === 'Integrations' && <svg className="w-4 h-4 mr-2 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>}
                {tab === 'Preferences' && <img src="/img/setting.svg" className="w-4 h-4 mr-2 opacity-70" alt="" />}
                {tab}
              </div>
            ))}
          </div>

          {/* Profile Form Card */}
          <div className="settings-glass-card p-6 w-full flex flex-col">
            <h3 className="text-white text-xl font-motive font-medium mb-6">Profile</h3>
            
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs uppercase tracking-wider ml-1">Full Name</label>
                <input 
                  type="text" 
                  className="settings-form-input" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs uppercase tracking-wider ml-1">Email</label>
                <input 
                  type="email" 
                  className="settings-form-input" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs uppercase tracking-wider ml-1">Company Name</label>
                <input 
                  type="text" 
                  className="settings-form-input" 
                  value={companyName} 
                  onChange={e => setCompanyName(e.target.value)} 
                  placeholder="e.g. Apex Logic Group"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-xs uppercase tracking-wider ml-1">Timezone</label>
                <div className="relative">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="settings-form-input appearance-none w-full border-none shadow-none focus:ring-0">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0e1526] border border-blue-500/20 text-gray-200">
                      <SelectItem value="GMT" className="focus:bg-white/10 cursor-pointer">GMT (Greenwich Mean Time)</SelectItem>
                      <SelectItem value="EST" className="focus:bg-white/10 cursor-pointer">EST (Eastern Standard Time)</SelectItem>
                      <SelectItem value="PST" className="focus:bg-white/10 cursor-pointer">PST (Pacific Standard Time)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="w-full flex justify-center mt-6">
                <button 
                  className={cn(
                    "px-8 py-2 rounded-full border border-gray-600 bg-black/40 text-gray-200 hover:bg-white/10 transition-colors flex items-center justify-center min-w-[160px]",
                    isSaved ? "border-green-500/50 text-green-400 bg-green-500/10" : ""
                  )}
                  onClick={handleSaveProfile}
                  disabled={isSaving || isUploading}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isUploading ? "Uploading..." : isSaved ? "Saved ✓" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="settings-glass-card p-6 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-t-red-900/30">
             <div className="flex flex-col mb-4 sm:mb-0">
               <h3 className="text-red-500 text-base font-motive font-medium mb-1 tracking-wide">Danger Zone</h3>
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                   <img src="/img-sidebar/account.svg" className="w-4 h-4 opacity-50" style={{ filter: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)' }} alt="" />
                 </div>
                 <div className="flex flex-col">
                   <p className="text-gray-200 text-sm font-medium">Delete Account</p>
                   <p className="text-gray-500 text-xs">This action cannot be undone.</p>
                 </div>
               </div>
             </div>
             
             <button 
                className="px-6 py-2 rounded-full border border-red-900/60 bg-transparent text-red-400 text-sm hover:bg-red-500/10 transition-colors flex justify-center items-center gap-2"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
               {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
               Delete Account
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
