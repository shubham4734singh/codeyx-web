'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { analyzeResumeLocally, LocalAtsResult } from '@/lib/atsChecker';
import { 
  Sparkles, AlertTriangle, CheckCircle, FileDown, RefreshCw, Plus, Trash, Eye,
  Link2, CheckCircle2, Globe, Github, Award, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TopNavbar from '@/components/shared/TopNavbar';

interface EducationEntry {
  college: string;
  degree: string;
  branch: string;
  year: string;
  location: string;
  gpa: string;
}

interface ProjectEntry {
  id: string;
  title: string;
  techStack: string[];
  description: string; // Bullet points separated by newlines
  githubUrl: string;
  liveUrl: string;
  selected: boolean;
}

interface CertificationEntry {
  title: string;
  issuer: string;
  date: string;
  url: string;
}

interface ResumeState {
  name: string;
  phone: string;
  email: string;
  location: string;
  linkedin: string;
  github: string;
  leetcode: string;
  codechef: string;
  summary: string;
  skillsCategories: {
    languages: string;
    frontend: string;
    backend: string;
    fundamentals: string;
    tools: string;
  };
  education: EducationEntry[];
  projects: ProjectEntry[];
  achievements: string[];
  certifications: CertificationEntry[];
}

interface AiFeedback {
  atsScore: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  improvements: {
    originalText: string;
    suggestedRewrite: string;
  }[];
}

const formatAiError = (err: any) => {
  const msg = err?.message || (typeof err === 'string' ? err : '');
  if (msg.includes('429') || msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
    return 'AI Limit reached. Please try again later or use the second option: switch to Groq / Gemini.';
  }
  return msg || 'An unexpected error occurred.';
};

export default function ResumeBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiTailoring, setAiTailoring] = useState(false);
  const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini');
  const [jobDescription, setJobDescription] = useState('');
  const [aiFeedback, setAiFeedback] = useState<AiFeedback | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'ai'>('edit');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [connectedPlatforms, setConnectedPlatforms] = useState<any[]>([]);
  const [rawCertText, setRawCertText] = useState('');
  const [parsingCerts, setParsingCerts] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // Core Resume State matching the uploaded image exactly
  const [resume, setResume] = useState<ResumeState>({
    name: 'YOUR NAME',
    phone: 'XXXXXXXXXX',
    email: 'xxxxxx@xxxxxx.com',
    location: 'XXXXXXXX, XXXXXXXX',
    linkedin: 'linkedin.com/in/xxxxxx',
    github: 'github.com/xxxxxx',
    leetcode: 'leetcode.com/xxxxxx',
    codechef: 'codechef.com/users/xxxxxx',
    summary: 'Brief professional summary highlighting your key skills, experience, and career goals. Connect your GitHub/coding platforms to automatically load profile and project details.',
    skillsCategories: {
      languages: 'Languages (e.g. Java, Python, JavaScript, SQL)',
      frontend: 'Frontend (e.g. HTML, CSS, React)',
      backend: 'Backend & DB (e.g. Node.js, Express, MongoDB)',
      fundamentals: 'CS Fundamentals (e.g. DSA, DBMS, OS)',
      tools: 'Tools & Technologies (e.g. Git, GitHub, VS Code, Postman)',
    },
    education: [
      {
        college: 'XXXXXXXX University / College',
        degree: 'Bachelor of Technology',
        branch: 'Computer Science & Engineering',
        year: '20XX – 20XX',
        location: 'XXXXXXXX, India',
        gpa: 'Current CGPA: X.XX',
      }
    ],
    projects: [
      {
        id: '1',
        title: 'Project Title 1',
        techStack: ['React', 'Node.js', 'MongoDB'],
        description: 'Detail your project implementation and achievements.\nHighlight key metrics (e.g. reduced loading time by 30%).\nList primary tools and APIs integrated.',
        githubUrl: '',
        liveUrl: '',
        selected: true,
      }
    ],
    achievements: [
      '**Coding Profile**: Connect LeetCode/CodeChef to fetch coding metrics.',
      '**Academic Excellence**: List academic or competitive achievements here.'
    ],
    certifications: [
      {
        title: 'Google Cloud Certified Associate Cloud Engineer',
        issuer: 'Google Cloud',
        date: '2026',
        url: 'https://credentials.google.com/...'
      }
    ]
  });

  // Pull Codeyx details to auto-populate if database contains them
  useEffect(() => {
    async function loadData() {
      try {
        const response: any = await api.get('/resume');
        if (response.success && response.data) {
          const { profile, projects, platformStats, clerkUser } = response.data;
          
          if (platformStats) {
            setConnectedPlatforms(platformStats);
          }
          
          if (profile || (projects && projects.length > 0) || (platformStats && platformStats.length > 0) || clerkUser) {
            const achievementsList = platformStats ? platformStats.map((stat: any) => {
              const platformName = stat.platform.charAt(0).toUpperCase() + stat.platform.slice(1);
              if (stat.platform === 'leetcode') {
                return `**Problem-Solving Skills**: Solved ${stat.totalSolved || 0}+ problems on LeetCode.`;
              } else if (stat.platform === 'codechef') {
                return `**Active Competitive Programmer**: Achieved a rating of ${stat.rating || 0} on CodeChef.`;
              }
              return `**Coding Achievements**: Solved ${stat.totalSolved || 0} problems on ${platformName}.`;
            }) : [];

            const mappedProjects = projects ? projects.map((proj: any) => ({
              id: proj._id,
              title: proj.title,
              techStack: proj.techStack || [],
              description: proj.description ? proj.description.split('\n').join('\n') : 'Describe your project bullets...',
              githubUrl: proj.githubUrl || '',
              liveUrl: proj.liveUrl || '',
              selected: true,
            })) : [];

            const mappedCertifications = profile?.courses ? profile.courses.map((course: any) => ({
              title: course.title,
              issuer: course.author || 'Codeyx Certified',
              date: '2026',
              url: course.link || ''
            })) : [];

            // Pre-categorize skills
            const languages = profile?.skills?.filter((s: string) => /java|python|javascript|cpp|c\+\+|sql|typescript/i.test(s)).join(', ') || '';
            const tools = profile?.skills?.filter((s: string) => /git|github|vscode|postman|vercel|docker|npm/i.test(s)).join(', ') || '';
            const otherSkills = profile?.skills?.filter((s: string) => !languages.includes(s) && !tools.includes(s)).join(', ') || '';

            let leetcodeUrl = 'leetcode.com/yourusername';
            let codechefUrl = 'codechef.com/users/yourusername';
            if (platformStats) {
              platformStats.forEach((stat: any) => {
                if (stat.platform === 'leetcode' && stat.username) {
                  leetcodeUrl = `leetcode.com/${stat.username}`;
                } else if (stat.platform === 'codechef' && stat.username) {
                  codechefUrl = `codechef.com/users/${stat.username}`;
                }
              });
            }

            let fetchedName = '';
            if (profile?.name) {
              fetchedName = profile.name.toUpperCase();
            } else if (clerkUser) {
              const nameParts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean);
              if (nameParts.length > 0) fetchedName = nameParts.join(' ').toUpperCase();
            }

            let fetchedEmail = '';
            if (profile?.email) {
              fetchedEmail = profile.email;
            } else if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
              fetchedEmail = clerkUser.emailAddresses[0].emailAddress;
            }

            let fetchedPhone = '';
            if (clerkUser?.phoneNumbers?.[0]?.phoneNumber) {
              fetchedPhone = clerkUser.phoneNumbers[0].phoneNumber;
            }

            setResume(prev => ({
              name: fetchedName || prev.name,
              phone: fetchedPhone || prev.phone,
              email: fetchedEmail || prev.email,
              location: profile?.location || prev.location,
              linkedin: profile?.socialLinks?.linkedin || prev.linkedin,
              github: profile?.socialLinks?.github || prev.github,
              leetcode: leetcodeUrl !== 'leetcode.com/yourusername' ? leetcodeUrl : prev.leetcode,
              codechef: codechefUrl !== 'codechef.com/users/yourusername' ? codechefUrl : prev.codechef,
              summary: profile?.about || prev.summary,
              skillsCategories: {
                languages: languages || prev.skillsCategories.languages,
                frontend: otherSkills.split(', ').slice(0, 5).join(', ') || prev.skillsCategories.frontend,
                backend: otherSkills.split(', ').slice(5, 10).join(', ') || prev.skillsCategories.backend,
                fundamentals: prev.skillsCategories.fundamentals,
                tools: tools || prev.skillsCategories.tools,
              },
              education: profile ? [
                {
                  college: profile.college || prev.education[0].college,
                  degree: profile.degree || prev.education[0].degree,
                  branch: profile.branch || '',
                  year: profile.year || prev.education[0].year,
                  location: profile.location || prev.education[0].location,
                  gpa: prev.education[0].gpa,
                }
              ] : prev.education,
              projects: mappedProjects.length > 0 ? mappedProjects : prev.projects,
              achievements: achievementsList.length > 0 ? achievementsList : prev.achievements,
              certifications: mappedCertifications.length > 0 ? mappedCertifications : prev.certifications
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute text for local score
  const getCompiledResumeText = () => {
    let text = `${resume.name} ${resume.phone} ${resume.email} ${resume.location} ${resume.linkedin} ${resume.github} ${resume.leetcode} ${resume.codechef}\n`;
    text += `${resume.summary}\n`;
    text += `${resume.skillsCategories.languages} ${resume.skillsCategories.frontend} ${resume.skillsCategories.backend} ${resume.skillsCategories.fundamentals} ${resume.skillsCategories.tools}\n`;
    resume.education.forEach(e => {
      text += `${e.college} ${e.degree} ${e.branch} ${e.year} ${e.location} ${e.gpa}\n`;
    });
    resume.projects.filter(p => p.selected).forEach(p => {
      text += `${p.title} ${p.techStack.join(' ')} ${p.description}\n`;
    });
    resume.achievements.forEach(ach => {
      text += `${ach}\n`;
    });
    if (resume.certifications) {
      resume.certifications.forEach(c => {
        text += `${c.title} ${c.issuer} ${c.date} ${c.url}\n`;
      });
    }
    return text;
  };

  const compiledText = getCompiledResumeText();
  const localAnalysis: LocalAtsResult = analyzeResumeLocally(compiledText);

  // Trigger ATS Audit Scan
  const handleAiScan = async () => {
    if (!jobDescription.trim()) return;
    setAiScanning(true);
    setAiFeedback(null);
    try {
      const response: any = await api.post('/resume/analyze', {
        resumeText: compiledText,
        jobDescription,
        provider
      });
      if (response.success && response.data) {
        setAiFeedback(response.data);
        setActiveTab('ai');
      }
    } catch (err: any) {
      setErrorModal({
        isOpen: true,
        title: 'AI Scan Failed',
        message: formatAiError(err)
      });
    } finally {
      setAiScanning(false);
    }
  };

  // Trigger AI Auto-Tailor
  const handleAutoTailor = async () => {
    if (!jobDescription.trim()) return;
    setAiTailoring(true);
    try {
      const response: any = await api.post('/resume/tailor', {
        resume,
        jobDescription,
        provider
      });

      if (response.success && response.data) {
        const tailored = response.data;
        
        // Map project rewrites by matching their IDs or title ordering
        const updatedProjects = resume.projects.map(proj => {
          const matchingTailoredProj = tailored.projects?.find((tp: any) => tp.id === proj.id || tp.title?.toLowerCase() === proj.title.toLowerCase());
          if (matchingTailoredProj && matchingTailoredProj.description) {
            return { ...proj, description: matchingTailoredProj.description };
          }
          return proj;
        });

        // Set tailored state
        setResume({
          ...resume,
          summary: tailored.summary || resume.summary,
          skillsCategories: {
            ...resume.skillsCategories,
            languages: tailored.skills?.slice(0, 5).join(', ') || resume.skillsCategories.languages,
            frontend: tailored.skills?.slice(5, 10).join(', ') || resume.skillsCategories.frontend,
            backend: tailored.skills?.slice(10, 15).join(', ') || resume.skillsCategories.backend,
          },
          projects: updatedProjects,
          achievements: tailored.achievements || resume.achievements,
          certifications: resume.certifications
        });

        alert('Resume auto-tailored successfully to match the job description! Check the sheet preview.');
      }
    } catch (err: any) {
      setErrorModal({
        isOpen: true,
        title: 'AI Auto-Tailoring Failed',
        message: formatAiError(err)
      });
    } finally {
      setAiTailoring(false);
    }
  };

  // Apply single rewrite
  const applyRewrite = (originalText: string, suggestedRewrite: string) => {
    const updatedProjects = resume.projects.map(proj => {
      if (proj.description.includes(originalText)) {
        return { ...proj, description: proj.description.replace(originalText, suggestedRewrite) };
      }
      return proj;
    });

    setResume({ ...resume, projects: updatedProjects });

    if (aiFeedback) {
      setAiFeedback({
        ...aiFeedback,
        improvements: aiFeedback.improvements.filter(imp => imp.originalText !== originalText)
      });
    }
  };

  // Download Word (DOCX) Document Helper
  const downloadAsDocx = async () => {
    setDownloadingDocx(true);
    try {
      const docx = await import('docx');
      const { Document, Packer, Paragraph, TextRun, BorderStyle, TabStopType, AlignmentType } = docx;

      const fileSaver = await import('file-saver');
      const saveAs = fileSaver.saveAs || (fileSaver as any).default;

      const fontName = fontFamily === 'serif' ? 'Georgia' : 'Arial';

      const createSectionHeader = (titleText: string) => {
        return new Paragraph({
          spacing: { before: 180, after: 60 },
          children: [
            new TextRun({
              text: titleText.toUpperCase(),
              bold: true,
              size: 22, // 11pt
              font: fontName,
            }),
          ],
          border: {
            bottom: {
              color: "000000",
              space: 2,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        });
      };

      const docChildren: any[] = [];

      // 1. Name & Contact Info
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: resume.name.toUpperCase(),
              bold: true,
              size: 32, // 16pt
              font: fontName,
            }),
          ],
        })
      );

      const contactParts = [];
      if (resume.phone) contactParts.push(`Phone: ${resume.phone}`);
      if (resume.email) contactParts.push(resume.email);
      if (resume.linkedin) contactParts.push(`LinkedIn: ${resume.linkedin.replace(/^https?:\/\//, '')}`);
      if (resume.github) contactParts.push(`GitHub: ${resume.github.replace(/^https?:\/\//, '')}`);
      if (resume.leetcode) contactParts.push(`LeetCode: ${resume.leetcode.replace(/^https?:\/\//, '')}`);
      if (resume.codechef) contactParts.push(`CodeChef: ${resume.codechef.replace(/^https?:\/\//, '')}`);

      if (contactParts.length > 0) {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: contactParts.join(" | "),
                size: 19, // 9.5pt
                font: fontName,
              }),
            ],
          })
        );
      }

      // 2. Summary
      if (resume.summary) {
        docChildren.push(createSectionHeader("Summary"));
        docChildren.push(
          new Paragraph({
            spacing: { after: 80 },
            alignment: AlignmentType.BOTH,
            children: [
              new TextRun({
                text: resume.summary,
                size: 19,
                font: fontName,
              }),
            ],
          })
        );
      }

      // 3. Technical Skills
      docChildren.push(createSectionHeader("Skills"));
      const skillCategories = [
        { label: "Languages", value: resume.skillsCategories.languages },
        { label: "Frontend", value: resume.skillsCategories.frontend },
        { label: "Backend & DB", value: resume.skillsCategories.backend },
        { label: "CS Fundamentals", value: resume.skillsCategories.fundamentals },
        { label: "Tools", value: resume.skillsCategories.tools },
      ];

      skillCategories.forEach((cat) => {
        if (cat.value) {
          docChildren.push(
            new Paragraph({
              spacing: { after: 30 },
              children: [
                new TextRun({
                  text: `${cat.label}: `,
                  bold: true,
                  size: 19,
                  font: fontName,
                }),
                new TextRun({
                  text: cat.value,
                  size: 19,
                  font: fontName,
                }),
              ],
            })
          );
        }
      });

      // 4. Projects
      const selectedProjects = resume.projects.filter((p) => p.selected);
      if (selectedProjects.length > 0) {
        docChildren.push(createSectionHeader("Projects"));
        selectedProjects.forEach((proj) => {
          const links: string[] = [];
          if (proj.githubUrl) links.push(`GitHub: ${proj.githubUrl}`);
          if (proj.liveUrl) links.push(`Live: ${proj.liveUrl}`);
          const linksText = links.length > 0 ? links.join(" | ") : "";

          docChildren.push(
            new Paragraph({
              spacing: { before: 60, after: 30 },
              tabStops: [
                {
                  type: TabStopType.RIGHT,
                  position: 9000,
                },
              ],
              children: [
                new TextRun({
                  text: proj.title,
                  bold: true,
                  size: 20, // 10pt
                  font: fontName,
                }),
                new TextRun({
                  text: ` | ${proj.techStack.join(", ")}`,
                  italics: true,
                  size: 19,
                  font: fontName,
                }),
                ...(linksText ? [
                  new TextRun({
                    text: `\t[${linksText}]`,
                    size: 17,
                    font: fontName,
                  })
                ] : [])
              ],
            })
          );

          proj.description.split("\n").filter(Boolean).forEach((bullet) => {
            docChildren.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 15, after: 15 },
                children: [
                  new TextRun({
                    text: bullet,
                    size: 19,
                    font: fontName,
                  }),
                ],
              })
            );
          });
        });
      }

      // 5. Education
      if (resume.education.length > 0) {
        docChildren.push(createSectionHeader("Education"));
        resume.education.forEach((edu) => {
          docChildren.push(
            new Paragraph({
              spacing: { before: 60, after: 20 },
              tabStops: [
                {
                  type: TabStopType.RIGHT,
                  position: 9000,
                },
              ],
              children: [
                new TextRun({
                  text: edu.college,
                  bold: true,
                  size: 20,
                  font: fontName,
                }),
                new TextRun({
                  text: `\t${edu.year}`,
                  bold: true,
                  size: 18,
                  font: fontName,
                }),
              ],
            })
          );

          docChildren.push(
            new Paragraph({
              spacing: { after: 30 },
              tabStops: [
                {
                  type: TabStopType.RIGHT,
                  position: 9000,
                },
              ],
              children: [
                new TextRun({
                  text: `${edu.degree}${edu.branch ? ` in ${edu.branch}` : ""}`,
                  italics: true,
                  size: 19,
                  font: fontName,
                }),
                new TextRun({
                  text: `\t${edu.location}`,
                  italics: true,
                  size: 19,
                  font: fontName,
                }),
              ],
            })
          );

          if (edu.gpa) {
            docChildren.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 15, after: 15 },
                children: [
                  new TextRun({
                    text: edu.gpa,
                    size: 19,
                    font: fontName,
                  }),
                ],
              })
            );
          }
        });
      }

      // 6. Certifications
      if (resume.certifications && resume.certifications.length > 0) {
        docChildren.push(createSectionHeader("Certifications"));
        resume.certifications.forEach((cert) => {
          docChildren.push(
            new Paragraph({
              spacing: { before: 40, after: 40 },
              tabStops: [
                {
                  type: TabStopType.RIGHT,
                  position: 9000,
                },
              ],
              children: [
                new TextRun({
                  text: cert.title,
                  bold: true,
                  size: 19,
                  font: fontName,
                }),
                new TextRun({
                  text: cert.issuer ? ` — ${cert.issuer}` : "",
                  size: 19,
                  font: fontName,
                }),
                new TextRun({
                  text: `\t${cert.date}`,
                  bold: true,
                  size: 18,
                  font: fontName,
                }),
              ],
            })
          );
        });
      }

      // 7. Achievements
      if (resume.achievements.length > 0) {
        docChildren.push(createSectionHeader("Achievements"));
        resume.achievements.forEach((ach) => {
          const regex = /\*\*(.*?)\*\*(.*)/;
          const match = ach.match(regex);
          let runs = [];
          if (match) {
            runs.push(new TextRun({ text: match[1], bold: true, size: 19, font: fontName }));
            runs.push(new TextRun({ text: match[2], size: 19, font: fontName }));
          } else {
            runs.push(new TextRun({ text: ach, size: 19, font: fontName }));
          }

          docChildren.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { before: 15, after: 15 },
              children: runs,
            })
          );
        });
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720,    // 0.5 inch (720 twips)
                  bottom: 720, // 0.5 inch
                  left: 720,   // 0.5 inch
                  right: 720,  // 0.5 inch
                }
              }
            },
            children: docChildren,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${resume.name.replace(/\s+/g, '_')}_Resume.docx`);
    } catch (err: any) {
      console.error('Error generating DOCX:', err);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setDownloadingDocx(false);
    }
  };

  // Education Helpers
  const addEducation = () => {
    setResume({
      ...resume,
      education: [
        ...resume.education,
        { college: 'New Institution', degree: 'Degree Details', branch: '', year: '202X - 202X', location: 'Location', gpa: 'CGPA / Grade' }
      ]
    });
  };

  const removeEducation = (index: number) => {
    const updated = [...resume.education];
    updated.splice(index, 1);
    setResume({ ...resume, education: updated });
  };

  // Project Helpers
  const addProject = () => {
    setResume({
      ...resume,
      projects: [
        ...resume.projects,
        {
          id: Date.now().toString(),
          title: 'New Project',
          techStack: ['React'],
          description: 'Bullet point 1...\nBullet point 2...',
          githubUrl: '',
          liveUrl: '',
          selected: true
        }
      ]
    });
  };

  const removeProject = (index: number) => {
    const updated = [...resume.projects];
    updated.splice(index, 1);
    setResume({ ...resume, projects: updated });
  };

  // Achievement Helpers
  const addAchievement = () => {
    setResume({
      ...resume,
      achievements: [...resume.achievements, '**Achievement Header**: Describe your achievement details...']
    });
  };

  const removeAchievement = (index: number) => {
    const updated = [...resume.achievements];
    updated.splice(index, 1);
    setResume({ ...resume, achievements: updated });
  };

  // Certification Helpers
  const addCertification = () => {
    setResume({
      ...resume,
      certifications: [
        ...(resume.certifications || []),
        { title: 'New Certification', issuer: 'Issuer Name', date: '2026', url: '' }
      ]
    });
  };

  const removeCertification = (index: number) => {
    const updated = [...(resume.certifications || [])];
    updated.splice(index, 1);
    setResume({ ...resume, certifications: updated });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090e] text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-gray-400">Loading premium resume builder templates...</p>
        </div>
      </div>
    );
  }

  const totalScore = aiFeedback 
    ? Math.round((localAnalysis.score + aiFeedback.atsScore) / 2) 
    : localAnalysis.score;

  const scoreColor = totalScore >= 85 ? 'text-green-500 border-green-500/20 bg-green-500/10' 
                   : totalScore >= 60 ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10' 
                   : 'text-red-500 border-red-500/20 bg-red-500/10';

  return (
    <div className="min-h-screen bg-[#07090e] text-foreground select-none print:bg-white print:p-0 print:text-black">
      {/* Navbar (Hidden in Print) */}
      <div className="print:hidden">
        <TopNavbar />
      </div>

      <div className="p-4 lg:p-8">
      
      {/* Header Panel (Hidden in Print) */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-border pb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="text-[#FF8A00] h-8 w-8 animate-pulse" />
            ATS Resume Tailor & Builder
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Build LaTeX-style single-column resumes tailored dynamically to job descriptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#0e131f] border border-border p-1 rounded-lg text-xs font-semibold">
            <button 
              onClick={() => setFontFamily('serif')}
              className={`px-3 py-1.5 rounded ${fontFamily === 'serif' ? 'bg-[#FF8A00] text-black font-extrabold' : 'text-gray-400'}`}
            >
              Serif (Georgia)
            </button>
            <button 
              onClick={() => setFontFamily('sans')}
              className={`px-3 py-1.5 rounded ${fontFamily === 'sans' ? 'bg-[#FF8A00] text-black font-extrabold' : 'text-gray-400'}`}
            >
              Sans-Serif (Arial)
            </button>
          </div>

          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF8A00] to-orange-500 hover:from-orange-500 hover:to-[#FF8A00] text-black font-extrabold rounded-lg text-sm transition-all shadow-md shadow-[#FF8A00]/20"
          >
            <FileDown className="h-4 w-4" />
            Print / Save PDF
          </button>

          <button 
            onClick={downloadAsDocx}
            disabled={downloadingDocx}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0e131f] border border-border hover:border-gray-500 text-white font-extrabold rounded-lg text-sm transition-all disabled:opacity-50"
          >
            {downloadingDocx ? (
              <RefreshCw className="h-4 w-4 text-[#FF8A00] animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 text-[#FF8A00]" />
            )}
            {downloadingDocx ? 'Generating Word...' : 'Download Word (DOCX)'}
          </button>
        </div>
      </header>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 print:block">
        
        {/* LEFT COLUMN: PARAMETER EDITOR (Hidden in Print) */}
        <aside className="xl:col-span-4 space-y-6 print:hidden">
          
          {/* Circular Gauge Score */}
          <div className={`p-5 rounded-2xl border ${scoreColor} transition-colors duration-500`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase opacity-85">ATS Audit Score</h3>
                <p className="text-xs opacity-75 mt-0.5">Real-time LaTeX format compliance</p>
              </div>
              <span className="text-3xl font-black">{totalScore}/100</span>
            </div>
            
            <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-current transition-all duration-1000 ease-out" 
                style={{ width: `${totalScore}%` }}
              />
            </div>
          </div>

          {/* Toggle Tab */}
          <div className="flex bg-[#0e131f] border border-border p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-2 text-center text-sm font-medium rounded-lg transition-all ${activeTab === 'edit' ? 'bg-[#FF8A00] text-black font-black' : 'text-gray-400 hover:text-white'}`}
            >
              Resume Editor
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2 text-center text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'bg-[#FF8A00] text-black font-black' : 'text-gray-400 hover:text-white'}`}
            >
              <Sparkles className="h-4 w-4" />
              AI JD Alignment
            </button>
          </div>

          {/* TAB 1: RESUME EDITOR */}
          {activeTab === 'edit' && (
            <div className="space-y-6 bg-[#0e131f]/60 backdrop-blur-md p-6 rounded-2xl border border-border max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Personal details */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A00]" />
                  Contact Credentials
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={resume.name}
                    onChange={(e) => setResume({ ...resume, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white"
                  />
                  <input 
                    type="text" 
                    placeholder="Phone Number (e.g. +91 7878065017)" 
                    value={resume.phone}
                    onChange={(e) => setResume({ ...resume, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white"
                  />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={resume.email}
                    onChange={(e) => setResume({ ...resume, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white"
                  />
                  <input 
                    type="text" 
                    placeholder="Location (e.g. Vadodara, India)" 
                    value={resume.location}
                    onChange={(e) => setResume({ ...resume, location: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white"
                  />
                  <input 
                    type="text" 
                    placeholder="LinkedIn Profile URL" 
                    value={resume.linkedin}
                    onChange={(e) => setResume({ ...resume, linkedin: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white"
                  />
                  <input 
                    type="text" 
                    placeholder="GitHub URL" 
                    value={resume.github}
                    onChange={(e) => setResume({ ...resume, github: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white"
                  />
                  <input 
                    type="text" 
                    placeholder="LeetCode profile URL" 
                    value={resume.leetcode}
                    onChange={(e) => setResume({ ...resume, leetcode: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white"
                  />
                  <input 
                    type="text" 
                    placeholder="CodeChef profile URL" 
                    value={resume.codechef}
                    onChange={(e) => setResume({ ...resume, codechef: e.target.value })}
                    className="w-full px-3 py-2 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white"
                  />
                </div>
              </div>

              {/* Connected Platforms Verification */}
              <div className="pt-4 border-t border-border/60">
                <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                    Connected Coding Accounts
                  </span>
                  <a 
                    href="/dashboard/platforms/leetcode" 
                    className="text-[10px] text-[#FF8A00] hover:underline flex items-center gap-1 normal-case"
                  >
                    Sync Settings <ExternalLink size={10} />
                  </a>
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {/* LeetCode */}
                  {(() => {
                    const linked = connectedPlatforms.find(p => p.platform === 'leetcode');
                    return (
                      <div className={`p-2.5 rounded-xl border flex flex-col justify-between h-20 transition-all ${linked ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-border'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-gray-400">LeetCode</span>
                          {linked ? (
                            <CheckCircle2 size={11} className="text-emerald-400" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                          )}
                        </div>
                        {linked ? (
                          <div className="mt-1">
                            <span className="text-[10px] font-black text-white truncate block">@{linked.username}</span>
                            <span className="text-[8px] text-emerald-400 font-bold mt-0.5 block">Solved: {linked.totalSolved || 0}</span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="text-[8.5px] text-gray-500 italic block">Unlinked</span>
                            <a href="/dashboard/platforms/leetcode" className="text-[8px] text-[#FF8A00] font-bold hover:underline block mt-0.5">Link Profile</a>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* CodeChef */}
                  {(() => {
                    const linked = connectedPlatforms.find(p => p.platform === 'codechef');
                    return (
                      <div className={`p-2.5 rounded-xl border flex flex-col justify-between h-20 transition-all ${linked ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/[0.02] border-border'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-gray-400">CodeChef</span>
                          {linked ? (
                            <CheckCircle2 size={11} className="text-amber-400" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                          )}
                        </div>
                        {linked ? (
                          <div className="mt-1">
                            <span className="text-[10px] font-black text-white truncate block">@{linked.username}</span>
                            <span className="text-[8px] text-amber-400 font-bold mt-0.5 block">Rating: {linked.rating || 0}</span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="text-[8.5px] text-gray-500 italic block">Unlinked</span>
                            <a href="/dashboard/platforms/leetcode" className="text-[8px] text-[#FF8A00] font-bold hover:underline block mt-0.5">Link Profile</a>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* GitHub */}
                  {(() => {
                    const linked = connectedPlatforms.find(p => p.platform === 'github');
                    return (
                      <div className={`p-2.5 rounded-xl border flex flex-col justify-between h-20 transition-all ${linked ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/[0.02] border-border'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-gray-400">GitHub</span>
                          {linked ? (
                            <CheckCircle2 size={11} className="text-blue-400" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                          )}
                        </div>
                        {linked ? (
                          <div className="mt-1">
                            <span className="text-[10px] font-black text-white truncate block">@{linked.username}</span>
                            <span className="text-[8px] text-blue-400 font-bold mt-0.5 block">Synced Projects</span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="text-[8.5px] text-gray-500 italic block">Unlinked</span>
                            <a href="/dashboard/platforms/github" className="text-[8px] text-[#FF8A00] font-bold hover:underline block mt-0.5">Link Profile</a>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Summary details */}
              <div className="pt-4 border-t border-border/60">
                <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A00]" />
                  Summary paragraph
                </h3>
                <textarea 
                  rows={4}
                  value={resume.summary}
                  onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                  placeholder="Professional Summary..."
                  className="w-full p-3 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white resize-none"
                />
              </div>

              {/* Categorised skills */}
              <div className="pt-4 border-t border-border/60">
                <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A00]" />
                  Technical Skills
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">Languages</label>
                    <input 
                      type="text" 
                      value={resume.skillsCategories.languages}
                      onChange={(e) => setResume({ ...resume, skillsCategories: { ...resume.skillsCategories, languages: e.target.value } })}
                      className="w-full px-3 py-1.5 bg-[#090b11] border border-border rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">Frontend</label>
                    <input 
                      type="text" 
                      value={resume.skillsCategories.frontend}
                      onChange={(e) => setResume({ ...resume, skillsCategories: { ...resume.skillsCategories, frontend: e.target.value } })}
                      className="w-full px-3 py-1.5 bg-[#090b11] border border-border rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">Backend & DB</label>
                    <input 
                      type="text" 
                      value={resume.skillsCategories.backend}
                      onChange={(e) => setResume({ ...resume, skillsCategories: { ...resume.skillsCategories, backend: e.target.value } })}
                      className="w-full px-3 py-1.5 bg-[#090b11] border border-border rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">CS Fundamentals</label>
                    <input 
                      type="text" 
                      value={resume.skillsCategories.fundamentals}
                      onChange={(e) => setResume({ ...resume, skillsCategories: { ...resume.skillsCategories, fundamentals: e.target.value } })}
                      className="w-full px-3 py-1.5 bg-[#090b11] border border-border rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">Tools</label>
                    <input 
                      type="text" 
                      value={resume.skillsCategories.tools}
                      onChange={(e) => setResume({ ...resume, skillsCategories: { ...resume.skillsCategories, tools: e.target.value } })}
                      className="w-full px-3 py-1.5 bg-[#090b11] border border-border rounded-lg text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Projects Selection & Bullets */}
              <div className="pt-4 border-t border-border/60">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A00]" />
                    Projects bullet points
                  </h3>
                  <button onClick={addProject} className="p-1 hover:bg-white/10 rounded text-[#FF8A00]"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  {resume.projects.map((proj, idx) => (
                    <div key={proj.id} className="p-3 bg-[#090b11] border border-border rounded-xl space-y-2 relative">
                      <button onClick={() => removeProject(idx)} className="absolute right-2 top-2 p-1 text-red-500 hover:bg-white/5 rounded"><Trash className="h-3.5 w-3.5" /></button>
                      <div className="flex items-center gap-2 mb-1">
                        <input 
                          type="checkbox" 
                          checked={proj.selected}
                          onChange={(e) => {
                            const updated = [...resume.projects];
                            updated[idx].selected = e.target.checked;
                            setResume({ ...resume, projects: updated });
                          }}
                          className="rounded text-[#FF8A00] focus:ring-0 bg-black border-border"
                        />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Include in Resume</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Project Title</label>
                          <input 
                            type="text" 
                            placeholder="Project Title" 
                            value={proj.title}
                            onChange={(e) => {
                              const updated = [...resume.projects];
                              updated[idx].title = e.target.value;
                              setResume({ ...resume, projects: updated });
                            }}
                            className="w-full px-2 py-1 bg-[#05060a] border border-border/60 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Tech Stack</label>
                          <input 
                            type="text" 
                            placeholder="React, Next.js" 
                            value={proj.techStack?.join(', ') || ''}
                            onChange={(e) => {
                              const updated = [...resume.projects];
                              updated[idx].techStack = e.target.value.split(',').map(s => s.trim());
                              setResume({ ...resume, projects: updated });
                            }}
                            className="w-full px-2 py-1 bg-[#05060a] border border-border/60 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">GitHub URL</label>
                          <input 
                            type="text" 
                            placeholder="https://github.com/..." 
                            value={proj.githubUrl || ''}
                            onChange={(e) => {
                              const updated = [...resume.projects];
                              updated[idx].githubUrl = e.target.value;
                              setResume({ ...resume, projects: updated });
                            }}
                            className="w-full px-2.5 py-1 bg-[#05060a] border border-border/60 rounded text-[10px] text-gray-300 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Live Link URL</label>
                          <input 
                            type="text" 
                            placeholder="https://..." 
                            value={proj.liveUrl || ''}
                            onChange={(e) => {
                              const updated = [...resume.projects];
                              updated[idx].liveUrl = e.target.value;
                              setResume({ ...resume, projects: updated });
                            }}
                            className="w-full px-2.5 py-1 bg-[#05060a] border border-border/60 rounded text-[10px] text-gray-300 focus:outline-none"
                          />
                        </div>
                      </div>

                      <textarea 
                        rows={4}
                        value={proj.description}
                        onChange={(e) => {
                          const updated = [...resume.projects];
                          updated[idx].description = e.target.value;
                          setResume({ ...resume, projects: updated });
                        }}
                        placeholder="Bullet points (one per line)..."
                        className="w-full p-2 bg-[#05060a] border border-border/60 rounded text-[11px] text-gray-300 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Education section */}
              <div className="pt-4 border-t border-border/60">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A00]" />
                    Education Entries
                  </h3>
                  <button onClick={addEducation} className="p-1 hover:bg-white/10 rounded text-[#FF8A00]"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  {resume.education.map((edu, idx) => (
                    <div key={idx} className="p-3 bg-[#090b11] border border-border rounded-xl relative space-y-2">
                      <button onClick={() => removeEducation(idx)} className="absolute right-2 top-2 p-1 text-red-500 hover:bg-white/5 rounded"><Trash className="h-3.5 w-3.5" /></button>
                      <input 
                        type="text" 
                        value={edu.college} 
                        placeholder="College/School Name"
                        onChange={(e) => {
                          const updated = [...resume.education];
                          updated[idx].college = e.target.value;
                          setResume({ ...resume, education: updated });
                        }}
                        className="w-[85%] bg-transparent border-b border-border/60 pb-0.5 text-xs text-white font-bold focus:outline-none"
                      />
                      <input 
                        type="text" 
                        value={edu.degree} 
                        placeholder="Degree details"
                        onChange={(e) => {
                          const updated = [...resume.education];
                          updated[idx].degree = e.target.value;
                          setResume({ ...resume, education: updated });
                        }}
                        className="w-full bg-transparent border-b border-border/60 pb-0.5 text-[11px] text-gray-300 focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          value={edu.year} 
                          placeholder="Duration (e.g. 2023 - 2027)"
                          onChange={(e) => {
                            const updated = [...resume.education];
                            updated[idx].year = e.target.value;
                            setResume({ ...resume, education: updated });
                          }}
                          className="bg-[#05060a] border border-border px-2 py-1 rounded text-[10px] text-white focus:outline-none"
                        />
                        <input 
                          type="text" 
                          value={edu.location} 
                          placeholder="Location"
                          onChange={(e) => {
                            const updated = [...resume.education];
                            updated[idx].location = e.target.value;
                            setResume({ ...resume, education: updated });
                          }}
                          className="bg-[#05060a] border border-border px-2 py-1 rounded text-[10px] text-white focus:outline-none"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={edu.gpa} 
                        placeholder="GPA Details (e.g. Current CGPA: 8.34)"
                        onChange={(e) => {
                          const updated = [...resume.education];
                          updated[idx].gpa = e.target.value;
                          setResume({ ...resume, education: updated });
                        }}
                        className="w-full bg-[#05060a] border border-border px-2 py-1 rounded text-[10px] text-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Certifications section */}
              <div className="pt-4 border-t border-border/60">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A00]" />
                    Certifications & Licenses
                  </h3>
                  <button onClick={addCertification} className="p-1 hover:bg-white/10 rounded text-[#FF8A00]"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  {(resume.certifications || []).map((cert, idx) => (
                    <div key={idx} className="p-3 bg-[#090b11] border border-border rounded-xl relative space-y-2">
                      <button onClick={() => removeCertification(idx)} className="absolute right-2 top-2 p-1 text-red-500 hover:bg-white/5 rounded"><Trash className="h-3.5 w-3.5" /></button>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Certification Name</label>
                          <input 
                            type="text" 
                            value={cert.title} 
                            placeholder="e.g. AWS Solutions Architect"
                            onChange={(e) => {
                              const updated = [...(resume.certifications || [])];
                              updated[idx].title = e.target.value;
                              setResume({ ...resume, certifications: updated });
                            }}
                            className="w-full bg-[#05060a] border border-border px-2 py-1.5 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Issuer / Organization</label>
                          <input 
                            type="text" 
                            value={cert.issuer} 
                            placeholder="e.g. Amazon Web Services"
                            onChange={(e) => {
                              const updated = [...(resume.certifications || [])];
                              updated[idx].issuer = e.target.value;
                              setResume({ ...resume, certifications: updated });
                            }}
                            className="w-full bg-[#05060a] border border-border px-2 py-1.5 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Year / Date</label>
                          <input 
                            type="text" 
                            value={cert.date} 
                            placeholder="e.g. 2026"
                            onChange={(e) => {
                              const updated = [...(resume.certifications || [])];
                              updated[idx].date = e.target.value;
                              setResume({ ...resume, certifications: updated });
                            }}
                            className="w-full bg-[#05060a] border border-border px-2 py-1.5 rounded text-[10px] text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Credential URL / Link</label>
                          <input 
                            type="text" 
                            value={cert.url || ''} 
                            placeholder="e.g. https://credentials..."
                            onChange={(e) => {
                              const updated = [...(resume.certifications || [])];
                              updated[idx].url = e.target.value;
                              setResume({ ...resume, certifications: updated });
                            }}
                            className="w-full bg-[#05060a] border border-border px-2 py-1.5 rounded text-[10px] text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements section */}
              <div className="pt-4 border-t border-border/60">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF8A00]" />
                    Achievements
                  </h3>
                  <button onClick={addAchievement} className="p-1 hover:bg-white/10 rounded text-[#FF8A00]"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-2">
                  {resume.achievements.map((ach, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <textarea 
                        rows={2}
                        value={ach}
                        onChange={(e) => {
                          const updated = [...resume.achievements];
                          updated[idx] = e.target.value;
                          setResume({ ...resume, achievements: updated });
                        }}
                        className="flex-1 p-2 bg-[#090b11] border border-border rounded text-[11px] text-white focus:outline-none resize-none"
                      />
                      <button onClick={() => removeAchievement(idx)} className="p-1.5 text-red-500 hover:bg-white/5 rounded mt-1"><Trash className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: AI JD ALIGNMENT */}
          {activeTab === 'ai' && (
            <div className="space-y-6 bg-[#0e131f]/60 backdrop-blur-md p-6 rounded-2xl border border-border">
              
              {/* Models selection */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Select Execution Engine</label>
                <div className="flex gap-2 p-1 bg-black border border-border rounded-lg">
                  <button 
                    onClick={() => setProvider('gemini')}
                    className={`flex-1 py-1.5 text-center text-xs font-semibold rounded transition-all ${provider === 'gemini' ? 'bg-[#1b253b] text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Google Gemini
                  </button>
                  <button 
                    onClick={() => setProvider('groq')}
                    className={`flex-1 py-1.5 text-center text-xs font-semibold rounded transition-all ${provider === 'groq' ? 'bg-[#1b253b] text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Groq Llama 3.1
                  </button>
                </div>
              </div>

              {/* Paste Job Description */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Paste Job Description</label>
                <textarea 
                  rows={6}
                  placeholder="Paste the target job details here so we can audit and tailor your resume details..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full p-3 bg-[#090b11] border border-border rounded-lg text-xs focus:ring-1 focus:ring-[#FF8A00] focus:outline-none text-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleAiScan}
                  disabled={aiScanning || aiTailoring || !jobDescription.trim()}
                  className="py-2.5 bg-gradient-to-r from-primary to-orange-500 disabled:opacity-40 text-black font-extrabold rounded-lg text-xs flex items-center justify-center gap-1.5 hover:shadow-lg transition-all"
                >
                  {aiScanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                  Audit Match
                </button>
                
                <button 
                  onClick={handleAutoTailor}
                  disabled={aiScanning || aiTailoring || !jobDescription.trim()}
                  className="py-2.5 bg-gradient-to-r from-[#FF8A00] to-amber-500 disabled:opacity-40 text-black font-extrabold rounded-lg text-xs flex items-center justify-center gap-1.5 hover:shadow-lg transition-all"
                >
                  {aiTailoring ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Auto-Tailor
                </button>
              </div>


            </div>
          )}

        </aside>

        {/* CENTER COLUMN: PDF RESUME SHEET PREVIEW */}
        <main className="xl:col-span-5 flex justify-center print:col-span-12">
          
          <div 
            id="resume-pdf-sheet"
            className="w-full max-w-[800px] min-h-[1050px] bg-white text-black shadow-2xl p-[0.4in] border border-gray-200 leading-relaxed text-[10px] select-text print:shadow-none print:border-none print:m-0 print:p-[0.3in]"
            style={{ 
              fontFamily: fontFamily === 'serif' ? 'Georgia, Times New Roman, serif' : 'ui-sans-serif, system-ui, sans-serif' 
            }}
          >
            {/* Centered Name and Contact pipes */}
            <div className="text-center mb-3">
              <h2 className="text-xl font-bold uppercase tracking-wider text-black mb-1">{resume.name}</h2>
              <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5 text-[9px] text-gray-800">
                {resume.phone && <span>Phone: {resume.phone}</span>}
                {resume.email && <span>| {resume.email}</span>}
                {resume.linkedin && (
                  <span>
                    | <a href={`https://${resume.linkedin.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a>
                  </span>
                )}
                {resume.github && (
                  <span>
                    | <a href={`https://${resume.github.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>
                  </span>
                )}
                {resume.leetcode && (
                  <span>
                    | <a href={`https://${resume.leetcode.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="hover:underline">LeetCode</a>
                  </span>
                )}
                {resume.codechef && (
                  <span>
                    | <a href={`https://${resume.codechef.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="hover:underline">CodeChef</a>
                  </span>
                )}
              </div>
            </div>

            {/* SUMMARY Section */}
            {resume.summary && (
              <div className="mb-3.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1 text-black">Summary</h3>
                <p className="text-[9.5px] text-gray-900 leading-normal text-justify">
                  {resume.summary}
                </p>
              </div>
            )}

            {/* SKILLS Section */}
            <div className="mb-3.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1 text-black">Skills</h3>
              <div className="space-y-0.5 text-[9.5px] text-gray-900">
                {resume.skillsCategories.languages && (
                  <p><strong>Languages:</strong> {resume.skillsCategories.languages}</p>
                )}
                {resume.skillsCategories.frontend && (
                  <p><strong>Frontend:</strong> {resume.skillsCategories.frontend}</p>
                )}
                {resume.skillsCategories.backend && (
                  <p><strong>Backend & DB:</strong> {resume.skillsCategories.backend}</p>
                )}
                {resume.skillsCategories.fundamentals && (
                  <p><strong>CS Fundamentals:</strong> {resume.skillsCategories.fundamentals}</p>
                )}
                {resume.skillsCategories.tools && (
                  <p><strong>Tools:</strong> {resume.skillsCategories.tools}</p>
                )}
              </div>
            </div>

            {/* PROJECTS Section */}
            {resume.projects.filter(p => p.selected).length > 0 && (
              <div className="mb-3.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1 text-black">Projects</h3>
                <div className="space-y-2.5">
                  {resume.projects.filter(p => p.selected).map((proj) => (
                    <div key={proj.id} className="text-[9.5px]">
                      <div className="flex justify-between items-baseline font-bold text-[10px] text-black">
                        <div>
                          <span className="font-extrabold">{proj.title}</span>
                          <span className="font-normal text-gray-800"> | </span>
                          <span className="font-normal italic text-gray-700">{proj.techStack.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[8.5px] text-gray-700 font-semibold print:text-black">
                          {proj.githubUrl && (
                            <a href={proj.githubUrl.startsWith('http') ? proj.githubUrl : `https://${proj.githubUrl}`} target="_blank" rel="noreferrer" className="hover:underline text-blue-600 print:text-black print:no-underline">
                              [GitHub]
                            </a>
                          )}
                          {proj.liveUrl && (
                            <a href={proj.liveUrl.startsWith('http') ? proj.liveUrl : `https://${proj.liveUrl}`} target="_blank" rel="noreferrer" className="hover:underline text-blue-600 print:text-black print:no-underline">
                              [Live]
                            </a>
                          )}
                        </div>
                      </div>
                      <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-gray-900 leading-normal">
                        {proj.description.split('\n').filter(Boolean).map((bullet, i) => (
                          <li key={i}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EDUCATION Section */}
            {resume.education.length > 0 && (
              <div className="mb-3.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1 text-black">Education</h3>
                <div className="space-y-2">
                  {resume.education.map((edu, idx) => (
                    <div key={idx} className="text-[9.5px]">
                      <div className="flex justify-between items-baseline text-[10px] text-black">
                        <span className="font-extrabold">{edu.college}</span>
                        <span className="font-bold text-[9px]">{edu.year}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-gray-700 italic mt-0.5">
                        <span>{edu.degree} {edu.branch && `in ${edu.branch}`}</span>
                        <span>{edu.location}</span>
                      </div>
                      {edu.gpa && (
                        <ul className="list-disc pl-4 mt-0.5 text-gray-800">
                          <li>
                            {edu.gpa.split(/(\d+\.\d+)/g).map((chunk, i) => 
                              /\d+\.\d+/.test(chunk) ? <strong className="text-black font-extrabold" key={i}>{chunk}</strong> : chunk
                            )}
                          </li>
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CERTIFICATIONS Section */}
            {resume.certifications && resume.certifications.length > 0 && (
              <div className="mb-3.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1 text-black">Certifications</h3>
                <div className="space-y-1">
                  {resume.certifications.map((cert, idx) => (
                    <div key={idx} className="text-[9.5px] flex justify-between items-baseline">
                      <div>
                        <span className="font-extrabold text-black">{cert.title}</span>
                        {cert.issuer && <span className="text-gray-800"> — {cert.issuer}</span>}
                        {cert.url && (
                          <a href={cert.url.startsWith('http') ? cert.url : `https://${cert.url}`} target="_blank" rel="noreferrer" className="ml-1.5 text-blue-600 hover:underline print:text-black print:no-underline text-[8px] font-semibold">
                            [Credential]
                          </a>
                        )}
                      </div>
                      <span className="font-bold text-[9px] text-black">{cert.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACHIEVEMENTS Section */}
            {resume.achievements.length > 0 && (
              <div className="mb-3.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1 text-black">Achievements</h3>
                <ul className="list-disc pl-4 space-y-0.5 text-[9.5px] text-gray-900">
                  {resume.achievements.map((ach, idx) => {
                    // Match bold headers inside double stars **
                    const regex = /\*\*(.*?)\*\*(.*)/;
                    const match = ach.match(regex);
                    if (match) {
                      return (
                        <li key={idx}>
                          <strong className="text-black font-extrabold">{match[1]}</strong>
                          {match[2]}
                        </li>
                      );
                    }
                    return <li key={idx}>{ach}</li>;
                  })}
                </ul>
              </div>
            )}

          </div>

        </main>

        {/* RIGHT COLUMN: AI AUDIT RESULTS FEEDBACK (Hidden in Print) */}
        <aside className="xl:col-span-3 print:hidden">
          
          <div className="bg-[#0e131f]/60 backdrop-blur-md p-6 rounded-2xl border border-border sticky top-8 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="text-[#FF8A00] h-4 w-4" />
              Recruiter Analytics
            </h3>

            {aiFeedback ? (
              <div className="space-y-6 max-h-[700px] overflow-y-auto pr-1">
                
                {/* Score */}
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-center">
                  <p className="text-xs text-gray-400 font-medium">ATS Match Score</p>
                  <p className="text-4xl font-extrabold text-[#FF8A00] mt-1">{aiFeedback.atsScore}%</p>
                  <p className="text-[9px] text-gray-400 mt-2">Keywords and role match evaluation completed.</p>
                </div>

                {/* Keywords list */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Role Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {aiFeedback.matchingKeywords.map((kw, idx) => (
                      <span key={idx} className="text-[9px] px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-md font-semibold">
                        ✓ {kw}
                      </span>
                    ))}
                    {aiFeedback.missingKeywords.map((kw, idx) => (
                      <span key={idx} className="text-[9px] px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md font-semibold">
                        + {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Candidate Strengths</h4>
                  <ul className="space-y-1 pl-4 list-disc text-[10px] text-gray-300">
                    {aiFeedback.strengths.map((str, idx) => (
                      <li key={idx}>{str}</li>
                    ))}
                  </ul>
                </div>

                {/* Custom Rewrites */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Bullet Point Suggestions</h4>
                  {aiFeedback.improvements.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No further adjustments recommended!</p>
                  ) : (
                    <div className="space-y-3">
                      {aiFeedback.improvements.map((imp, idx) => (
                        <div key={idx} className="p-3 bg-[#090b11] border border-border rounded-xl space-y-2">
                          <div>
                            <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">Original</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 italic">"{imp.originalText}"</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-green-400 font-bold uppercase tracking-wider">AI Suggestion</p>
                            <p className="text-[10px] text-white mt-0.5 font-medium">"{imp.suggestedRewrite}"</p>
                          </div>
                          <button 
                            onClick={() => applyRewrite(imp.originalText, imp.suggestedRewrite)}
                            className="w-full py-1 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-[10px] font-bold rounded-lg transition-all"
                          >
                            Apply Bullet Change
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 space-y-3">
                <Sparkles className="h-8 w-8 text-gray-700 mx-auto animate-pulse" />
                <p className="text-xs leading-relaxed">
                  Enter a target role and paste a Job Description, then trigger a **Deep Scan** to analyze keywords, identify gaps, and generate ATS rewrites!
                </p>
              </div>
            )}

          </div>

        </aside>

      </div>

      </div>

      {/* Printing Page breaks and settings */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, aside, footer, nav, button, select, input, textarea {
            display: none !important;
          }
          #resume-pdf-sheet {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0.1in 0.2in !important;
            margin: 0 !important;
            min-height: auto !important;
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            box-sizing: border-box !important;
          }
          html, body {
            width: 8.5in;
            height: 11in;
            page-break-after: avoid;
            page-break-before: avoid;
          }
        }
      `}} />

      {/* Centered Custom Error Modal */}
      <AnimatePresence>
        {errorModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0e131f] p-6 shadow-2xl z-10"
            >
              {/* Glow decoration */}
              <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-[#FF8A00]/10 blur-3xl pointer-events-none" />
              
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF8A00] mb-4">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                
                <h3 className="text-base font-bold text-white mb-2">{errorModal.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-6 whitespace-pre-line">{errorModal.message}</p>
                
                <button
                  onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-2 bg-gradient-to-r from-[#FF8A00] to-orange-500 hover:from-orange-500 hover:to-[#FF8A00] text-black font-extrabold rounded-lg text-xs transition-all shadow-md shadow-[#FF8A00]/20"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
