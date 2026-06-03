"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { useUser } from '@clerk/nextjs';
import { profileService } from '@/services/profile.service';

export interface PlatformHandles {
  leetcode: string;
  codeforces: string;
  codechef: string;
  github: string;
  gfg: string;
  atcoder: string;
  hackerrank: string;
}

export interface UserProfile {
  username: string;
  firstName: string;
  lastName: string;
  degree: string;
  college: string;
  branch: string;
  gradYear: string;
  country: string;
  jobRole: string;
  skills: string[];
  isOnboarded: boolean;
  step1Complete: boolean;
  platformHandles: PlatformHandles;
  bio?: string;
  portfolio?: string;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}

interface OnboardingContextProps {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => void;
  completeUsernameSetup: (username: string, firstName: string, lastName: string) => void;
  completeFullProfile: (details: Omit<UserProfile, 'username' | 'firstName' | 'lastName' | 'isOnboarded' | 'step1Complete' | 'platformHandles'>) => void;
  resetOnboarding: () => void;
}

const defaultPlatformHandles: PlatformHandles = {
  leetcode: 'mTQb0YqjQb',
  codeforces: '',
  codechef: 'lalitmodi7878',
  github: 'LalitModi90',
  gfg: 'lalitmodiog7e',
  atcoder: '',
  hackerrank: 'lalitmodi7878065',
};

const defaultProfile: UserProfile = {
  username: '',
  firstName: '',
  lastName: '',
  degree: '',
  college: '',
  branch: '',
  gradYear: '',
  country: '',
  jobRole: '',
  skills: [],
  isOnboarded: false,
  step1Complete: false,
  platformHandles: { ...defaultPlatformHandles },
  bio: '',
  portfolio: '',
  socialLinks: {
    linkedin: '',
    github: '',
  }
};

const OnboardingContext = createContext<OnboardingContextProps | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDbVerified, setIsDbVerified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded: isClerkLoaded } = useUser();

  // Load from localStorage on mount — merge with defaults for new fields
  useEffect(() => {
    try {
      const saved = localStorage.getItem('coderyx_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile({
          ...defaultProfile,
          ...parsed,
          platformHandles: {
            ...defaultPlatformHandles,
            ...(parsed.platformHandles || {}),
          },
        });
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    }
    setIsInitialized(true);
  }, []);

  // Fetch and verify database profile to bypass onboarding for existing users
  useEffect(() => {
    if (isClerkLoaded && !user?.id) {
      setIsDbVerified(true);
      return;
    }
    if (!user?.id) return;
    
    const checkDatabaseProfile = async () => {
      try {
        const response: any = await profileService.getProfile(user.id);
        
        let dbProfile = response;
        if (response && typeof response === 'object') {
          if (response.data && typeof response.data === 'object') {
            if (response.data.data && typeof response.data.data === 'object') {
              dbProfile = response.data.data;
            } else {
              dbProfile = response.data;
            }
          }
        }
        
        // If the database has a profile and the user has filled details, verify them
        if (dbProfile && Object.keys(dbProfile).length > 0 && dbProfile.userId) {
          const isComplete = !!(
            dbProfile.degree || 
            dbProfile.branch || 
            dbProfile.college || 
            dbProfile.jobRole || 
            dbProfile.location || 
            (dbProfile.skills && dbProfile.skills.length > 0)
          );
          
          if (isComplete) {
            // Existing user detected! Instate their profile and bypass onboarding.
            updateProfile({
              ...dbProfile,
              username: dbProfile.username || profile.username || user?.username || '',
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              isOnboarded: true,
              step1Complete: true
            });
          } else {
            // Brand-new user with incomplete details: force onboarding
            updateProfile({
              ...dbProfile,
              username: dbProfile.username || profile.username || user?.username || '',
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              isOnboarded: false,
              step1Complete: profile.step1Complete || false
            });
          }
        } else {
          // No profile in database yet: force onboarding
          updateProfile({
            ...defaultProfile,
            username: profile.username || user?.username || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            isOnboarded: false,
            step1Complete: profile.step1Complete || false
          });
        }
      } catch (err) {
        console.error('Failed checking database profile for onboarding bypass:', err);
      } finally {
        setIsDbVerified(true);
      }
    };

    checkDatabaseProfile();
  }, [user?.id, isClerkLoaded]);

  // Sync to localStorage
  const updateProfile = (data: Partial<UserProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...data };
      try {
        localStorage.setItem('coderyx_profile', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save profile', e);
      }
      return updated;
    });
  };

  const completeUsernameSetup = (username: string, firstName: string, lastName: string) => {
    updateProfile({
      username,
      firstName,
      lastName,
      step1Complete: true
    });
    router.push('/dashboard/onboarding');
  };

  const completeFullProfile = (details: Partial<UserProfile>) => {
    updateProfile({
      ...details,
      isOnboarded: true
    });
    router.push('/dashboard');
  };

  const resetOnboarding = () => {
    setProfile(defaultProfile);
    try {
      localStorage.removeItem('coderyx_profile');
    } catch (e) {
      console.error(e);
    }
    router.push('/dashboard/onboarding');
  };

  // Redirect logic to enforce onboarding
  useEffect(() => {
    if (!isInitialized) return;
    if (user?.id && !isDbVerified) return; // Wait for DB sync to finish to prevent layout flash/shifts

    const isOnboardingRoute = pathname === '/dashboard/onboarding';

    // Only enforce redirect if the user is actually logged in
    if (user?.id) {
      if (!profile.isOnboarded && !isOnboardingRoute) {
        router.push('/dashboard/onboarding');
      } else if (profile.isOnboarded && isOnboardingRoute) {
        router.push('/dashboard');
      }
    }
  }, [profile, isInitialized, isDbVerified, pathname, router, user?.id]);

  return (
    <OnboardingContext.Provider value={{ profile, updateProfile, completeUsernameSetup, completeFullProfile, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
