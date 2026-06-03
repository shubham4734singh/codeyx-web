'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface AdSettings {
  adType: 'google' | 'custom' | 'none';
  googleAdClient: string;
  googleAdSlot: string;
  googleAdSlotSidebar: string;
  customAdImageUrl: string;
  customAdLinkUrl: string;
  customAdTitle: string;
  customAdDescription: string;
}

export default function DashboardAdCard() {
  const [adSettings, setAdSettings] = useState<AdSettings>({
    adType: 'custom',
    googleAdClient: 'ca-pub-YOUR_PUBLISHER_ID',
    googleAdSlot: 'YOUR_DEFAULT_SLOT_ID',
    googleAdSlotSidebar: 'YOUR_DEFAULT_SLOT_ID',
    customAdImageUrl: '',
    customAdLinkUrl: 'https://codeyx.com/premium',
    customAdTitle: 'Codeyx Premium Pro',
    customAdDescription: 'Unlock advanced sheets, 1-on-1 mentorship, and premium dev projects to boost your skills.',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
        console.log('🔍 FETCHING AD SETTINGS FROM:', `${apiUrl}/settings`);
        const res = await fetch(`${apiUrl}/settings`);
        console.log('🔍 AD SETTINGS RESPONSE STATUS:', res.status);
        const data = await res.json();
        console.log('🔍 AD SETTINGS DATA:', data);
        if (data.success && data.data) {
          setAdSettings(data.data);
        }
      } catch (err) {
        console.error('❌ Failed to load ad settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdSettings();
  }, []);

  useEffect(() => {
    // If it's a google ad, we need to push to window.adsbygoogle
    if (adSettings.adType === 'google') {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense Error (DashboardCard):', error);
      }
    }
  }, [adSettings]);

  if (adSettings.adType === 'none') {
    return null;
  }

  return (
    <div className="bg-[#101014] border border-white/5 rounded-[24px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Small Header */}
      <div className="w-full flex justify-between items-center mb-4">
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
          {adSettings.adType === 'google' ? 'Sponsored' : 'Featured Promotion'}
        </span>
        <span className="text-[10px] text-white/40">
          Ad
        </span>
      </div>

      {adSettings.adType === 'google' ? (
        /* Google AdSense */
        <div className="w-full flex items-center justify-center min-h-[200px] bg-white/[0.01] rounded-xl border border-dashed border-white/10 p-2 overflow-hidden">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%', minHeight: '200px' }}
            data-ad-client={adSettings.googleAdClient}
            data-ad-slot={adSettings.googleAdSlotSidebar || adSettings.googleAdSlot}
            data-ad-format="rectangle"
            data-full-width-responsive="true"
          />
        </div>
      ) : (
        /* Custom Promotion Card (Entire card is a link) */
        <a
          href={adSettings.customAdLinkUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-4 group cursor-pointer block"
        >
          {adSettings.customAdImageUrl && (
            <div className="w-full h-32 rounded-xl overflow-hidden relative border border-white/10">
              <img
                src={adSettings.customAdImageUrl}
                alt={adSettings.customAdTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <div className="flex-1">
            <h4 className="font-extrabold text-sm text-white mb-1.5 flex items-center gap-1.5 group-hover:text-[#FF8A00] transition-colors">
              {adSettings.customAdTitle}
              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-all duration-200" />
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {adSettings.customAdDescription}
            </p>
          </div>
        </a>
      )}
    </div>
  );
}
