'use client';

import { useEffect } from 'react';

interface StickySidebarAdProps {
  dataAdSlot: string;
  dataAdClient?: string;
  height?: string; // Optional custom height, e.g. "250px" or "600px"
}

export default function StickySidebarAd({
  dataAdSlot,
  dataAdClient = 'ca-pub-2934790485812892',
  height = '300px',
}: StickySidebarAdProps) {
  useEffect(() => {
    try {
      // Initialize AdSense ad when component mounts
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (error) {
      console.error('AdSense Error (StickySidebar):', error);
    }
  }, []);

  return (
    <div 
      className="sticky top-24 w-full rounded-xl bg-[#111216]/50 border border-white/10 p-4 flex flex-col items-center justify-between shadow-lg overflow-hidden"
      style={{ minHeight: height }}
    >
      {/* Small Header */}
      <div className="w-full flex justify-between items-center mb-3">
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
          Advertisement
        </span>
        <span className="text-[10px] text-white/40">
          Sponsored
        </span>
      </div>

      {/* Ad Container */}
      <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={dataAdClient}
          data-ad-slot={dataAdSlot}
          data-ad-format="rectangle"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
