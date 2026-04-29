"use client";

import React, { useState, useRef, useEffect } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Loader2, Pen, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (status === "loading" || status === "unauthenticated") {
    return <div className="settings-bg flex items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  const themeOptions = [
    { value: "dark", label: "Dark", icon: Moon, description: "Darker interface for low-light environments" },
    { value: "light", label: "Light", icon: Sun, description: "Bright interface for well-lit environments" },
    { value: "system", label: "System", icon: Monitor, description: "Automatically matches your device settings" },
  ];

  return (
    <div className="settings-bg">
      <header className="chat-top">
        <div className="flex items-center gap-3">
          <SidebarToggle className="sidebar-toggle-external text-white" />
        </div>

        <div className="flex items-center gap-2">
          {/* Branding - Right side only */}
          <div className="btn2 btn premium-btn">
            <p>RyvonAI v1.0</p>
          </div>
        </div>
      </header>

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
            <div className="flex items-center gap-3">
              <button className="px-6 py-2 rounded-full border border-gray-600 text-gray-200 text-sm hover:bg-white/5 transition-colors">
                Upgrade Plan
              </button>
              <button 
                onClick={handleSignOut}
                className="px-6 py-2 rounded-full border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="settings-glass-card flex flex-col sm:flex-row p-1 sm:p-2 w-full justify-between items-center sm:h-14 overflow-x-auto gap-2 sm:gap-0">
            {['Profile', 'Security', 'Billing', 'Integrations', 'Preferences'].map((tab) => (
              <div 
                key={tab}
                className={cn("settings-tab flex items-center justify-center min-w-[120px]", activeTab === tab ? "active" : "")}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'Profile' && <img src="/img-sidebar/account.svg" className="w-4 h-4 mr-2 opacity-70" alt="" />}
                {tab === 'Preferences' && <img src="/img/setting.svg" className="w-4 h-4 mr-2 opacity-70" alt="" />}
                {tab}
              </div>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === "Profile" && (
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
          )}

          {/* Preferences Tab — Theme Toggle */}
          {activeTab === "Preferences" && (
            <div className="settings-glass-card p-6 w-full flex flex-col">
              <h3 className="text-white text-xl font-motive font-medium mb-2">Preferences</h3>
              <p className="text-gray-500 text-sm mb-8">Customize the look and feel of Ryvon Intelligence.</p>

              {/* Theme Selection */}
              <div className="mb-8">
                <label className="text-gray-400 text-xs uppercase tracking-wider ml-1 mb-4 block">Appearance</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {themeOptions.map((opt) => {
                    const isActive = theme === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-5 rounded-xl border transition-all cursor-pointer",
                          isActive
                            ? "border-blue-500/50 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                          isActive ? "bg-blue-500/20" : "bg-white/5"
                        )}>
                          <Icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "text-gray-500")} />
                        </div>
                        <div className="text-center">
                          <p className={cn("text-sm font-medium", isActive ? "text-white" : "text-gray-300")}>{opt.label}</p>
                          <p className="text-[11px] text-gray-500 mt-1">{opt.description}</p>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notification Preferences placeholder */}
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider ml-1 mb-4 block">Notifications</label>
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <div>
                    <p className="text-white text-sm font-medium">Email Notifications</p>
                    <p className="text-gray-500 text-xs mt-1">Receive workflow run summaries and alerts</p>
                  </div>
                  <div className="w-10 h-6 rounded-full bg-blue-500/30 border border-blue-500/50 flex items-center px-0.5 cursor-pointer">
                    <div className="w-5 h-5 rounded-full bg-blue-400 shadow-md ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab placeholder */}
          {activeTab === "Security" && (
            <div className="settings-glass-card p-6 w-full flex flex-col">
              <h3 className="text-white text-xl font-motive font-medium mb-2">Security</h3>
              <p className="text-gray-500 text-sm mb-6">Manage your password and security settings.</p>
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <p className="text-white text-sm font-medium">Change Password</p>
                  <p className="text-gray-500 text-xs mt-1">Update your account password for enhanced security.</p>
                  <button className="mt-3 px-5 py-2 rounded-full border border-white/15 text-gray-300 text-xs hover:bg-white/5 transition-colors">
                    Update Password
                  </button>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <p className="text-white text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-gray-500 text-xs mt-1">Add an extra layer of security to your account.</p>
                  <button className="mt-3 px-5 py-2 rounded-full border border-white/15 text-gray-300 text-xs hover:bg-white/5 transition-colors">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab placeholder */}
          {activeTab === "Billing" && (
            <div className="settings-glass-card p-6 w-full flex flex-col">
              <h3 className="text-white text-xl font-motive font-medium mb-2">Billing</h3>
              <p className="text-gray-500 text-sm mb-6">Manage your subscription and payment methods.</p>
              <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">Current Plan</p>
                    <p className="text-white text-xl font-medium mt-1">Pro</p>
                    <p className="text-gray-500 text-xs mt-1">Unlimited workflows, all connectors, priority support</p>
                  </div>
                  <button className="px-5 py-2 rounded-full text-white text-xs font-medium" style={{ background: 'linear-gradient(180deg, #A8CEE5 0%, #007DC0 50%, #001C3C 100%)' }}>
                    Manage Plan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab placeholder */}
          {activeTab === "Integrations" && (
            <div className="settings-glass-card p-6 w-full flex flex-col">
              <h3 className="text-white text-xl font-motive font-medium mb-2">Integrations</h3>
              <p className="text-gray-500 text-sm mb-6">Connected services and third-party integrations.</p>
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Google Account</p>
                    <p className="text-gray-500 text-xs">{email || "Not connected"}</p>
                  </div>
                </div>
                <span className="text-green-400 text-xs font-medium bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">Connected</span>
              </div>
              <button 
                onClick={() => router.push("/workflows/connectors")}
                className="mt-4 text-blue-400 text-sm hover:text-blue-300 transition-colors text-left cursor-pointer"
              >
                View all connectors →
              </button>
            </div>
          )}

          {/* Danger Zone — always visible */}
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
