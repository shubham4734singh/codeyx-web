'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface AdSettings {
  adType: 'google' | 'custom' | 'none';
  googleAdClient: string;
  googleAdSlot: string;
  customAdImageUrl: string;
  customAdLinkUrl: string;
  customAdTitle: string;
  customAdDescription: string;
}

export default function StickyBottomAd() {
  const [adSettings, setAdSettings] = useState<AdSettings>({
    adType: 'custom',
    googleAdClient: 'ca-pub-YOUR_PUBLISHER_ID',
    googleAdSlot: 'YOUR_DEFAULT_SLOT_ID',
    customAdImageUrl: '',
    customAdLinkUrl: 'https://codeyx.com/premium',
    customAdTitle: 'Codeyx Premium Pro',
    customAdDescription: 'Unlock advanced sheets, 1-on-1 mentorship, and premium dev projects to boost your skills.',
  });
  
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let timer: any;

    const checkVisibilityStatus = () => {
      const dismissedAt = localStorage.getItem('bottom_ad_dismissed_at');
      if (dismissedAt) {
        const timePassed = Date.now() - parseInt(dismissedAt, 10);
        const fiveMinutes = 5 * 60 * 1000;

        if (timePassed < fiveMinutes) {
          setIsVisible(false);
          const remainingTime = fiveMinutes - timePassed;
          timer = setTimeout(() => {
            setIsVisible(true);
          }, remainingTime);
        } else {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }
    };

    const fetchAdSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
        const res = await fetch(`${apiUrl}/settings`);
        const data = await res.json();
        if (data.success && data.data) {
          setAdSettings(data.data);
          setIsLoaded(true);
          if (data.data.adType !== 'none') {
            checkVisibilityStatus();
          }
        } else {
          setIsLoaded(true);
          checkVisibilityStatus();
        }
      } catch (err) {
        console.error('Failed to load bottom ad settings', err);
        setIsLoaded(true);
        checkVisibilityStatus();
      }
    };

    fetchAdSettings();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isLoaded && isVisible && adSettings.adType === 'google') {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense Error (StickyBottom):', error);
      }
    }
  }, [isLoaded, isVisible, adSettings]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsVisible(false);
    localStorage.setItem('bottom_ad_dismissed_at', Date.now().toString());
    
    // Auto-reappear in 5 minutes if they stay on the same page
    setTimeout(() => {
      if (adSettings.adType !== 'none') {
        setIsVisible(true);
      }
    }, 5 * 60 * 1000);
  };

  if (!isLoaded || !isVisible || adSettings.adType === 'none') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-[#111216]/95 backdrop-blur-md border-t border-white/10 px-6 py-3.5 shadow-2xl transition-all duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {adSettings.adType === 'google' ? (
          /* Google AdSense Horizontal Banner */
          <>
            <div className="hidden md:flex flex-col items-start shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                Sponsored Ad
              </span>
              <span className="text-xs text-white/60">
                Support our platform
              </span>
            </div>

            <div className="flex-1 w-full flex justify-center items-center min-h-[50px] md:min-h-[70px] overflow-hidden bg-white/[0.02] border border-dashed border-white/10 rounded-xl px-4 py-2 relative">
              {/* Fallback label visible when script hasn't loaded (e.g. localhost) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <span className="text-[10px] tracking-wider text-white font-mono">
                  [ Google AdSense Ad Slot - Active ]
                </span>
              </div>
              <ins
                className="adsbygoogle relative z-10"
                style={{ display: 'inline-block', width: '100%', height: '100%', minHeight: '50px' }}
                data-ad-client={adSettings.googleAdClient}
                data-ad-slot={adSettings.googleAdSlot}
                data-ad-format="horizontal"
                data-full-width-responsive="true"
              />
            </div>
          </>
        ) : (
          /* Custom Promotion Horizontal Banner */
          <a
            href={adSettings.customAdLinkUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center gap-4 group cursor-pointer"
          >
            {adSettings.customAdImageUrl && (
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 hidden sm:block">
                <img
                  src={adSettings.customAdImageUrl}
                  alt={adSettings.customAdTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider text-[#FF8A00] font-bold px-1.5 py-0.5 bg-[#FF8A00]/10 border border-[#FF8A00]/20 rounded-md">
                  Promo
                </span>
                <h4 className="font-extrabold text-sm text-white truncate group-hover:text-[#FF8A00] transition-colors">
                  {adSettings.customAdTitle}
                </h4>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {adSettings.customAdDescription}
              </p>
            </div>
            
            <div className="shrink-0 hidden md:flex items-center gap-1.5 bg-[#FF8A00] hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-[0_2px_10px_rgba(255,138,0,0.2)]">
              <span>Learn More</span>
              <ExternalLink size={12} />
            </div>
          </a>
        )}

        {/* Manual Hide Icon Button */}
        <button
          onClick={handleDismiss}
          className="flex items-center justify-center w-8 h-8 rounded-full text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer shrink-0"
          aria-label="Hide Ad Banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
