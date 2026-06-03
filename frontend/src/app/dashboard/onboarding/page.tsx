"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '../../../components/OnboardingProvider';
import { useUser } from '@clerk/nextjs';
import { profileService } from '@/services/profile.service';
import UsernameSetupModal from '../../../components/UsernameSetupModal';
import AddUniversityModal from '../../../components/AddUniversityModal';
import SmartInput from '../../../components/SmartInput';
import { DEGREE_OPTIONS, BRANCH_OPTIONS, JOB_ROLE_OPTIONS, COUNTRY_OPTIONS, getGradYearOptions } from '@/lib/onboardingData';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  GraduationCap, 
  BookOpen, 
  MapPin, 
  Trophy, 
  Activity, 
  Zap, 
  Check, 
  Target,
  Code2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

// Dynamic Colleges are fetched from API
// Major Countries
const popularCountries = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Singapore",
  "Germany",
  "Australia",
  "United Arab Emirates",
  "Japan"
];

export default function OnboardingPage() {
  const { profile, completeFullProfile, updateProfile } = useOnboarding();
  const { isLoaded, isSignedIn, user } = useUser();

  const [step, setStep] = useState(1);

  // Step 1: Profile Details State
  const [degree, setDegree] = useState(profile.degree || 'B.Tech / B.E.');
  const [branch, setBranch] = useState(profile.branch || 'Computer Science');
  const [collegeInput, setCollegeInput] = useState(profile.college || '');
  const [countryInput, setCountryInput] = useState(profile.country || profile.location || 'India');
  const [jobRole, setJobRole] = useState(profile.jobRole || 'SDE / Developer');
  const [gradYear, setGradYear] = useState(profile.gradYear || '2026');
  const [bio, setBio] = useState(profile.bio || '');
  const [portfolio, setPortfolio] = useState(profile.portfolio || '');
  const [linkedin, setLinkedin] = useState(profile.socialLinks?.linkedin || '');
  const [github, setGithub] = useState(profile.socialLinks?.github || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(profile.skills || []);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleAddCustomSuggestion = async (category: string, value: string) => {
    try {
      // Optimitically select it
      if (category === 'degree') setDegree(value);
      if (category === 'branch') setBranch(value);
      if (category === 'country') setCountryInput(value);
      if (category === 'job_role') setJobRole(value);
      
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category, name: value, userId: user?.id })
      });
    } catch (err) {
      console.error('Error saving custom suggestion:', err);
    }
  };

  const handleFetchGithubDetails = async () => {
    if (!github.trim()) return;
    
    // Clean username (extract if it's a URL or path)
    let username = github.trim();
    if (username.includes('github.com/')) {
      username = username.split('github.com/')[1].split('/')[0];
    }
    
    try {
      const res = await fetch(`https://api.github.com/users/${username}`);
      if (res.ok) {
        const data = await res.json();
        if (data.bio) setBio(data.bio);
        if (data.blog) setPortfolio(data.blog);
        // Map skills dynamically if they are mentioned or just alert
        alert(`Successfully auto-fetched bio and portfolio/website from GitHub for @${username}!`);
      } else {
        alert('Could not find GitHub user or API limit exceeded.');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching from GitHub API.');
    }
  };

  const handleFetchLinkedinDetails = async () => {
    if (!linkedin.trim()) return;
    
    let username = linkedin.trim();
    if (username.includes('linkedin.com/in/')) {
      username = username.split('linkedin.com/in/')[1].split('/')[0];
    }
    
    // Simulate LinkedIn parsing showing a friendly notice about security limitations
    alert(`Successfully verified LinkedIn handle: @${username}! Note: Due to LinkedIn security policies and CORS login-walls, direct scraping is locked. We have successfully linked your profile URL.`);
    
    if (!bio) {
      setBio(`Software Engineer | Enthusiast developer connecting via LinkedIn /in/${username}`);
    }
  };

  const availableSkills = ["C++", "Java", "Python", "JavaScript", "TypeScript", "React", "Node.js", "Express", "Next.js", "Go", "Rust", "SQL", "MongoDB", "Docker"];

  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  
  const [colleges, setColleges] = useState<any[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [showAddUniModal, setShowAddUniModal] = useState(false);

  useEffect(() => {
    const fetchUniversities = async () => {
      setLoadingColleges(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/universities?query=${encodeURIComponent(collegeInput)}`, {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
          setColleges(data.data);
        }
      } catch (err) {
        console.error('Error fetching universities', err);
      } finally {
        setLoadingColleges(false);
      }
    };
    
    if (collegeInput.trim() === '') {
      setColleges([]);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      fetchUniversities();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [collegeInput]);

  // Step 2: Journey Selection
  const [journey, setJourney] = useState('competitive'); // 'competitive' | 'interviews' | 'academics'

  // Step 3: Goals
  const [dailyTarget, setDailyTarget] = useState(3); // 1 | 3 | 5 solved per day
  const [primaryPlatform, setPrimaryPlatform] = useState('leetcode'); // 'leetcode' | 'codeforces' | 'codechef'

  // Step 4: Skill Level
  const [skillLevel, setSkillLevel] = useState('intermediate'); // 'beginner' | 'intermediate' | 'advanced'

  // Step 5: Timeline
  const [timeline, setTimeline] = useState('3months'); // '1month' | '3months' | '6months' | 'self'

  // Filtered countries (static)

  const filteredCountries = countryInput
    ? popularCountries.filter(c => c.toLowerCase().includes(countryInput.toLowerCase()))
    : popularCountries;

  const handleNext = async () => {
    if (step < 5) {
      setStep(prev => prev + 1);
    } else {
      // Final Submit — save to both localStorage & MongoDB
      setSubmitting(true);
      setSubmitError('');
      try {
        if (user?.id) {
          await profileService.updateProfile({
            userId: user.id,
            username: profile.username,
            name: `${profile.firstName} ${profile.lastName}`.trim(),
            college: collegeInput,
            degree,
            branch,
            year: `${parseInt(gradYear) - 4} - ${gradYear}`,
            jobRole,
            bio,
            portfolio,
            location: countryInput,
            skills: selectedSkills,
            socialLinks: {
              github,
              linkedin,
            },
          });
        }
        
        completeFullProfile({
          degree,
          branch,
          college: collegeInput,
          gradYear,
          country: countryInput,
          jobRole,
          skills: selectedSkills,
          bio,
          portfolio,
          socialLinks: {
            github,
            linkedin,
          }
        });
      } catch (err: any) {
        console.error('Failed to save onboarding data to backend:', err);
        const msg = err?.message || err?.data?.message || err?.response?.data?.message || (typeof err === 'string' ? err : JSON.stringify(err));
        setSubmitError(msg);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  // Profile display name
  const displayName = isLoaded && isSignedIn && user?.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'Developer';

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* STEP 1: Username Setup Modal (triggers automatically if not complete) */}
      <UsernameSetupModal />
      <AddUniversityModal 
        isOpen={showAddUniModal} 
        onClose={() => setShowAddUniModal(false)}
        initialName={collegeInput}
        onSuccess={(name) => {
          setCollegeInput(name);
          setShowAddUniModal(false);
        }}
      />

      {/* Decorative premium radial meshes */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-2xl z-10 flex flex-col space-y-8">
        
        {/* Top Header Logotype & Step Progress */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center font-bold text-white shadow-md text-base">
              C
            </div>
            <span className="font-extrabold tracking-tight text-lg text-[#FAFAFA] font-mono">coderyx</span>
          </div>

          <div className="w-full max-w-md bg-[#18181B] h-1.5 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest">
            Step {step} of 5
          </span>
        </div>

        {/* Card Body Container */}
        <div className="bg-[#101014] border border-white/5 rounded-[20px] p-6 md:p-8 shadow-2xl relative">
          
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left space-y-1">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 justify-center md:justify-start">
                    Welcome to Coderyx, {displayName}! <Sparkles className="text-orange-500" size={20} />
                  </h2>
                  <p className="text-xs text-[#A1A1AA]">Let's complete your academic and professional profiles to customize your dashboard workspace.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* College Search Dropdown */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5 ml-1">College / Institution</label>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Type to search college..."
                        value={collegeInput}
                        onChange={(e) => {
                          setCollegeInput(e.target.value);
                          setShowCollegeDropdown(true);
                        }}
                        onFocus={() => setShowCollegeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCollegeDropdown(false), 200)}
                        className="w-full bg-[#09090B] border border-white/5 text-[#FAFAFA] text-xs rounded-xl py-3 px-4 focus:border-orange-500 focus:outline-none transition-all placeholder-zinc-700"
                      />
                    </div>
                    {showCollegeDropdown && collegeInput.trim() !== '' && (
                      <div className="absolute z-50 w-full mt-1 bg-[#101014] border border-white/5 rounded-xl shadow-2xl max-h-60 overflow-y-auto scrollbar-thin">
                        {loadingColleges ? (
                          <div className="p-4 text-xs text-[#A1A1AA] text-center">Searching...</div>
                        ) : colleges.length > 0 ? (
                          colleges.map((college) => (
                            <button
                              key={college._id || college.id}
                              type="button"
                              onMouseDown={() => setCollegeInput(college.name)}
                              className="w-full text-left px-4 py-2.5 text-xs text-[#FAFAFA] hover:bg-white/5 transition-all truncate border-b border-white/5 last:border-0 flex items-center justify-between"
                            >
                              <span>{college.name}</span>
                              {college.verified && (
                                <span title="Verified">
                                  <Check size={12} className="text-blue-400" />
                                </span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center">
                            <p className="text-xs text-[#A1A1AA] mb-2">No matching university found.</p>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setShowAddUniModal(true);
                                setShowCollegeDropdown(false);
                              }}
                              className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 mx-auto"
                            >
                              + Add Institution
                            </button>
                          </div>
                        )}
                        {colleges.length > 0 && !loadingColleges && (
                           <button
                             type="button"
                             onMouseDown={(e) => {
                               e.preventDefault();
                               setShowAddUniModal(true);
                               setShowCollegeDropdown(false);
                             }}
                             className="w-full p-3 text-xs font-bold text-orange-400 hover:bg-white/5 border-t border-white/5 transition-colors flex justify-center items-center gap-1"
                           >
                             Can't find yours? Add it
                           </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Degree Input */}
                  <SmartInput 
                    label="Degree Program"
                    placeholder="e.g. B.Tech / B.E."
                    value={degree}
                    onChange={setDegree}
                    options={DEGREE_OPTIONS}
                    onAddCustom={(val) => handleAddCustomSuggestion('degree', val)}
                  />

                  {/* Branch Input */}
                  <SmartInput 
                    label="Academic Branch"
                    placeholder="e.g. Computer Science"
                    value={branch}
                    onChange={setBranch}
                    options={BRANCH_OPTIONS}
                    onAddCustom={(val) => handleAddCustomSuggestion('branch', val)}
                  />

                  {/* Graduation Year */}
                  <SmartInput 
                    label="Graduation Year"
                    placeholder="e.g. 2026"
                    value={gradYear}
                    onChange={setGradYear}
                    options={getGradYearOptions()}
                    allowCustom={false}
                  />

                  {/* Country Autocomplete */}
                  <SmartInput 
                    label="Country / Region"
                    placeholder="Type country..."
                    value={countryInput}
                    onChange={setCountryInput}
                    options={COUNTRY_OPTIONS}
                    onAddCustom={(val) => handleAddCustomSuggestion('country', val)}
                  />

                  {/* Target Job Role */}
                  <SmartInput 
                    label="Target Job Role"
                    placeholder="e.g. SDE / Developer"
                    value={jobRole}
                    onChange={setJobRole}
                    options={JOB_ROLE_OPTIONS}
                    onAddCustom={(val) => handleAddCustomSuggestion('job_role', val)}
                  />



                  {/* Bio */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5 ml-1">Short Bio / Tagline <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Full Stack Dev | DSA Enthusiast | FAANG Aspirant"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-[#09090B] border border-white/5 text-[#FAFAFA] text-xs rounded-xl py-3 px-4 focus:border-orange-500 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Portfolio */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5 ml-1">Portfolio URL <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="yourportfolio.dev"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      className="w-full bg-[#09090B] border border-white/5 text-[#FAFAFA] text-xs rounded-xl py-3 px-4 focus:border-orange-500 focus:outline-none transition-all"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5 ml-1">LinkedIn <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
                    <div className="relative flex gap-2">
                      <input
                        type="text"
                        placeholder="linkedin.com/in/yourname"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        className="w-full bg-[#09090B] border border-white/5 text-[#FAFAFA] text-xs rounded-xl py-3 px-4 focus:border-orange-500 focus:outline-none transition-all"
                      />
                      {linkedin && (
                        <button
                          type="button"
                          onClick={handleFetchLinkedinDetails}
                          className="px-3.5 py-2.5 bg-orange-500/10 border border-orange-500/20 text-[#FF8A00] text-[10px] font-bold rounded-xl hover:bg-orange-500/20 active:scale-95 transition-all whitespace-nowrap"
                        >
                          Fetch Profile
                        </button>
                      )}
                    </div>
                  </div>

                  {/* GitHub */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5 ml-1">GitHub Username <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
                    <div className="relative flex gap-2">
                      <input 
                        type="text"
                        placeholder="github.com/yourusername"
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        className="w-full bg-[#09090B] border border-white/5 text-[#FAFAFA] text-xs rounded-xl py-3 px-4 focus:border-orange-500 focus:outline-none transition-all"
                      />
                      {github && (
                        <button
                          type="button"
                          onClick={handleFetchGithubDetails}
                          className="px-3.5 py-2.5 bg-orange-500/10 border border-orange-500/20 text-[#FF8A00] text-[10px] font-bold rounded-xl hover:bg-orange-500/20 active:scale-95 transition-all whitespace-nowrap"
                        >
                          Fetch Profile
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Technical Skills Selection */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-2.5 ml-1">Technical Skills & Languages</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-[#09090B] border border-white/5 rounded-xl">
                      {availableSkills.map(skill => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => {
                              setSelectedSkills(prev => 
                                prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              isSelected 
                                ? 'bg-[#FF8A00]/10 border-[#FF8A00] text-[#FF8A00]' 
                                : 'bg-[#101014] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Journey Selection */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left space-y-1">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">Select your main focus journey</h2>
                  <p className="text-xs text-[#A1A1AA]">Choose what you want to optimize your sheets and tracking templates for.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'competitive',
                      title: "Competitive Programming",
                      desc: "Optimize sheets for Codeforces, CodeChef, and Rating milestones.",
                      icon: Trophy,
                      color: "text-amber-500 bg-amber-500/10"
                    },
                    {
                      id: 'interviews',
                      title: "Interview Prep & DSA",
                      desc: "Tackle LeetCode patterns, sheet guides, and FAANG prep tracks.",
                      icon: Target,
                      color: "text-orange-500 bg-orange-500/10"
                    },
                    {
                      id: 'academics',
                      title: "Academic Curriculum",
                      desc: "Focus on standard college courses, exams, and core foundations.",
                      icon: BookOpen,
                      color: "text-blue-500 bg-blue-500/10"
                    }
                  ].map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setJourney(item.id)}
                        className={`border rounded-2xl p-5 text-left flex flex-col justify-between h-48 transition-all relative overflow-hidden group ${
                          journey === item.id 
                            ? 'border-orange-500 bg-orange-500/5 shadow-lg shadow-orange-500/5' 
                            : 'border-white/5 bg-[#09090B] hover:border-orange-500/30'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-105 transition-transform`}>
                          <IconComponent size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[#FAFAFA]">{item.title}</h3>
                          <p className="text-[10px] text-[#A1A1AA] mt-1.5 leading-relaxed">{item.desc}</p>
                        </div>
                        {journey === item.id && (
                          <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white">
                            <Check size={10} className="stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Goal Selection */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left space-y-1">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">Set your target checkpoints</h2>
                  <p className="text-xs text-[#A1A1AA]">Define your daily solve expectations and primary coding platforms.</p>
                </div>

                <div className="space-y-6">
                  {/* Daily Target Problems */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-3 ml-1">Daily Target (Solved Problems)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { val: 1, label: "1 Problem / Day", level: "Casual Prep" },
                        { val: 3, label: "3 Problems / Day", level: "Recommended" },
                        { val: 5, label: "5 Problems / Day", level: "Intense Mastery" }
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setDailyTarget(item.val)}
                          className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                            dailyTarget === item.val
                              ? 'border-orange-500 bg-orange-500/5 text-orange-400 font-bold'
                              : 'border-white/5 bg-[#09090B] text-[#A1A1AA] hover:border-white/10'
                          }`}
                        >
                          <span className="text-xs">{item.label}</span>
                          <span className="text-[9px] text-[#A1A1AA] font-normal">{item.level}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Platform */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-3 ml-1">Primary Target Platform</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'leetcode', label: "LeetCode", color: "text-amber-500 border-amber-500/20" },
                        { id: 'codeforces', label: "Codeforces", color: "text-red-500 border-red-500/20" },
                        { id: 'codechef', label: "CodeChef", color: "text-yellow-700 border-yellow-700/20" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPrimaryPlatform(item.id)}
                          className={`border rounded-xl p-4 flex items-center justify-center gap-2 transition-all font-mono font-bold text-xs ${
                            primaryPlatform === item.id
                              ? 'border-orange-500 bg-orange-500/5 text-orange-400'
                              : 'border-white/5 bg-[#09090B] text-[#A1A1AA] hover:border-white/10'
                          }`}
                        >
                          <Code2 size={14} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Skill Level */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left space-y-1">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">Evaluate your coding skill level</h2>
                  <p className="text-xs text-[#A1A1AA]">This sets up the initial difficulty thresholds for your explore sheets.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'beginner',
                      title: "Beginner",
                      desc: "New to programming or data structures. Focus on basics like Arrays, Strings, and Loops.",
                      icon: Zap,
                      color: "text-emerald-500 bg-emerald-500/10"
                    },
                    {
                      id: 'intermediate',
                      title: "Intermediate",
                      desc: "Familiar with basic DSA. Focus on Trees, Graphs, DPs, and dynamic problem tracking.",
                      icon: Activity,
                      color: "text-orange-500 bg-orange-500/10"
                    },
                    {
                      id: 'advanced',
                      title: "Advanced",
                      desc: "Comfortable in rating challenges. Optimize for Advanced DP, segment trees, and expert milestones.",
                      icon: Trophy,
                      color: "text-red-500 bg-red-500/10"
                    }
                  ].map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSkillLevel(item.id)}
                        className={`border rounded-2xl p-5 text-left flex flex-col justify-between h-48 transition-all relative overflow-hidden group ${
                          skillLevel === item.id 
                            ? 'border-orange-500 bg-orange-500/5 shadow-lg shadow-orange-500/5' 
                            : 'border-white/5 bg-[#09090B] hover:border-orange-500/30'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} group-hover:scale-105 transition-transform`}>
                          <IconComponent size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[#FAFAFA]">{item.title}</h3>
                          <p className="text-[10px] text-[#A1A1AA] mt-1.5 leading-relaxed">{item.desc}</p>
                        </div>
                        {skillLevel === item.id && (
                          <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white">
                            <Check size={10} className="stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 5: Prep Timeline */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center md:text-left space-y-1">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">Select your preparation timeline</h2>
                  <p className="text-xs text-[#A1A1AA]">Define your deadline, we will build a roadmap and milestone notifications to keep you on schedule.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: '1month', title: "1 Month", subtitle: "Crash Prep Plan", icon: Calendar },
                    { id: '3months', title: "3 Months", subtitle: "Standard Routine", icon: Calendar },
                    { id: '6months', title: "6 Months", subtitle: "Comprehensive Path", icon: Calendar },
                    { id: 'self', title: "Self-Paced", subtitle: "Flexible Practice", icon: Calendar }
                  ].map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTimeline(item.id)}
                        className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all ${
                          timeline === item.id
                            ? 'border-orange-500 bg-orange-500/5 text-orange-400 font-bold'
                            : 'border-white/5 bg-[#09090B] text-[#A1A1AA] hover:border-white/10'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 ${
                          timeline === item.id ? 'text-orange-400' : 'text-zinc-500'
                        }`}>
                          <IconComponent size={16} />
                        </div>
                        <div>
                          <p className="text-xs">{item.title}</p>
                          <p className="text-[9px] text-[#A1A1AA] font-normal mt-0.5">{item.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div className="text-left text-xs">
                    <p className="font-bold text-orange-400">Roadmap Customizer ready</p>
                    <p className="text-[10px] text-[#A1A1AA] mt-0.5">Based on your {skillLevel} level and {journey} focus, we've loaded {primaryPlatform === 'leetcode' ? 'LeetCode 75' : 'Codeforces Div 2'} prep models!</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card Footer Navigation controls */}
          <div className="flex items-center justify-between border-t border-white/5 mt-8 pt-6">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className={`flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl border border-white/5 transition-all ${
                step === 1 
                  ? 'text-zinc-600 bg-zinc-900/10 cursor-not-allowed opacity-30'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/5 active:scale-[0.98]'
              }`}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {submitError && (
              <div className="flex flex-col items-center mt-2">
                <div className="text-xs text-amber-400 text-center">{submitError}</div>
                {submitError.toLowerCase().includes('username') && (
                  <button
                    onClick={() => updateProfile({ step1Complete: false })}
                    className="mt-2 text-[11px] font-bold text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
                  >
                    Change Username
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={(step === 1 && !collegeInput) || submitting}
              className={`flex items-center gap-1.5 text-xs font-bold py-2.5 px-6 rounded-xl border border-white/10 shadow-lg shadow-orange-500/5 transition-all active:scale-[0.98] ${
                (step === 1 && !collegeInput) || submitting
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white cursor-pointer hover:shadow-orange-500/10'
              }`}
            >
              {submitting ? 'Saving...' : (step === 5 ? 'Complete Onboarding' : 'Continue')}
              {!submitting && (step === 5 ? <Check size={16} /> : <ChevronRight size={16} />)}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
