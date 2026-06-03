"use client";

import React, { useState, useEffect } from "react";
import { Save, User, Key, Globe, Shield, Database, RefreshCw, Megaphone } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

const getApiUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5005/api";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005/api";
};
const API_URL = getApiUrl();

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    platformName: "Codeyx",
    supportEmail: "support@codeyx.com",
    siteDescription: "Codeyx is a modern coding platform...",
    maintenanceMode: false,
    alfaLeetcodeUrl: "https://alfa-leetcode-api.onrender.com",
    githubToken: "",
    adType: "google",
    googleAdClient: "",
    googleAdSlot: "",
    googleAdSlotSidebar: "",
    customAdImageUrl: "",
    customAdLinkUrl: "",
    customAdTitle: "",
    customAdDescription: ""
  });
  const { getToken } = useAuth();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(prev => ({
          ...prev,
          ...data.data
        }));
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) alert("Settings saved successfully!");
      else alert("Failed to save settings: " + data.message);
    } catch (err) {
      alert("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global platform behavior and API keys.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Save size={18} className={isSaving ? "animate-pulse" : ""} />
          <span>{isSaving ? "Saving Changes..." : "Save All Changes"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Side Tabs */}
        <div className="col-span-1 space-y-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg text-sm text-left transition-colors ${
              activeTab === 'general' ? 'bg-card border border-primary/20 text-primary shadow-sm' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Globe size={18} /> General
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg text-sm text-left transition-colors ${
              activeTab === 'api' ? 'bg-card border border-primary/20 text-primary shadow-sm' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Key size={18} /> API Keys
          </button>
          <button 
            onClick={() => setActiveTab('ads')}
            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg text-sm text-left transition-colors ${
              activeTab === 'ads' ? 'bg-card border border-primary/20 text-primary shadow-sm' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Megaphone size={18} /> Ads & Promotion
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg text-sm text-left transition-colors ${
              activeTab === 'security' ? 'bg-card border border-primary/20 text-primary shadow-sm' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Shield size={18} /> Security
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg text-sm text-left transition-colors ${
              activeTab === 'database' ? 'bg-card border border-primary/20 text-primary shadow-sm' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Database size={18} /> Database
          </button>
        </div>

        {/* Content Area */}
        <div className="col-span-1 md:col-span-3 space-y-6">
          {activeTab === 'general' && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <h3 className="font-bold text-foreground">General Configuration</h3>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Platform Name</label>
                    <input type="text" name="platformName" value={settings.platformName} onChange={handleChange} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Support Email</label>
                    <input type="email" name="supportEmail" value={settings.supportEmail} onChange={handleChange} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Site Description (SEO)</label>
                  <textarea rows={3} name="siteDescription" value={settings.siteDescription} onChange={handleChange} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Maintenance Mode</h4>
                    <p className="text-xs text-muted-foreground">Disable access to the main platform for regular users.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="maintenanceMode" checked={settings.maintenanceMode} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <h3 className="font-bold text-foreground">API Integrations</h3>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Alfa LeetCode API URL</label>
                  <input type="text" name="alfaLeetcodeUrl" value={settings.alfaLeetcodeUrl} onChange={handleChange} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">GitHub REST API Token (PAT)</label>
                  <input type="password" name="githubToken" value={settings.githubToken} onChange={handleChange} placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx" className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
                  <p className="text-xs text-muted-foreground mt-1">Used for syncing repositories and commits without rate limits.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ads' && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <h3 className="font-bold text-foreground">Ads & Promotion Settings</h3>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Advertisement Type</label>
                  <select 
                    name="adType" 
                    value={settings.adType} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 bg-[#090b11] text-foreground border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="google" className="bg-[#111216] text-white">Google AdSense</option>
                    <option value="custom" className="bg-[#111216] text-white">Custom Banner Promotion</option>
                    <option value="none" className="bg-[#111216] text-white">No Ads (Disabled)</option>
                  </select>
                </div>

                {settings.adType === 'google' && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Google AdSense Client ID</label>
                      <input type="text" name="googleAdClient" value={settings.googleAdClient} onChange={handleChange} placeholder="ca-pub-xxxxxxxxxxxxxxxx" className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Google AdSense Slot ID (Bottom Banner)</label>
                      <input type="text" name="googleAdSlot" value={settings.googleAdSlot} onChange={handleChange} placeholder="4267648729" className="w-full px-4 py-2 bg-[#090b11] text-foreground border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Google AdSense Slot ID (Sidebar Card)</label>
                      <input type="text" name="googleAdSlotSidebar" value={settings.googleAdSlotSidebar || ''} onChange={handleChange} placeholder="6235336515" className="w-full px-4 py-2 bg-[#090b11] text-foreground border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                )}

                {settings.adType === 'custom' && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Custom Ad Title</label>
                      <input type="text" name="customAdTitle" value={settings.customAdTitle} onChange={handleChange} placeholder="Learn Web Development" className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Custom Ad Description</label>
                      <textarea name="customAdDescription" value={settings.customAdDescription} onChange={handleChange} placeholder="Upgrade your coding skills today..." rows={2} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Custom Ad Target URL (Destination Link)</label>
                      <input type="text" name="customAdLinkUrl" value={settings.customAdLinkUrl} onChange={handleChange} placeholder="https://example.com/course" className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Custom Ad Banner Image URL (Optional)</label>
                      <input type="text" name="customAdImageUrl" value={settings.customAdImageUrl} onChange={handleChange} placeholder="https://example.com/banner.png" className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center text-muted-foreground">
              <Shield size={48} className="mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-foreground mb-2">Security Settings</h3>
              <p>Advanced security configuration is coming in the next update.</p>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center text-muted-foreground">
              <Database size={48} className="mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-foreground mb-2">Database Management</h3>
              <p>Database backup and manual indexing options will appear here.</p>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
