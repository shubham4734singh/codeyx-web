import { Request, Response } from 'express';
import { Profile } from '../models/profile.model';
import { Project } from '../models/project.model';
import { PlatformStats } from '../models/platformStats.model';
import { clerkClient } from '@clerk/express';

// Aggregates user profile, projects, and platform stats to auto-populate the resume builder
export const getResumeData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Fetch all related databases in parallel
    const [profile, projects, stats] = await Promise.all([
      Profile.findOne({ userId }),
      Project.find({ userId, visibility: 'public' }),
      PlatformStats.find({ userId })
    ]);

    let clerkUser = null;
    try {
      clerkUser = await clerkClient.users.getUser(userId);
    } catch (e) {
      console.error("Clerk fetch user failed in getResumeData:", e);
    }

    return res.status(200).json({
      success: true,
      data: {
        profile: profile || null,
        projects: projects || [],
        platformStats: stats || [],
        clerkUser: clerkUser ? {
          phoneNumbers: clerkUser.phoneNumbers,
          emailAddresses: clerkUser.emailAddresses,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName
        } : null
      }
    });
  } catch (error: any) {
    console.error('Error fetching resume data:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch resume data: ' + error.message });
  }
};

const handleAiError = (error: any, res: Response, defaultMessage: string) => {
  const errMsg = error.message || '';
  if (errMsg.includes('429') || errMsg.toLowerCase().includes('limit') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('exhausted')) {
    return res.status(429).json({
      success: false,
      message: 'AI Limit reached. Please try again later or switch to the other execution engine (Gemini / Groq).'
    });
  }
  return res.status(500).json({ success: false, message: defaultMessage + ': ' + errMsg });
};

const SYSTEM_PROMPT = `
You are an expert ATS (Applicant Tracking System) parser. Analyze the Candidate's Resume against the provided Job Description.
Analyze the alignment and provide constructive, detailed feedback. Return ONLY a valid JSON object matching this structure:
{
  "atsScore": number (0 to 100 representing job alignment),
  "matchingKeywords": ["list", "of", "matched", "keywords"],
  "missingKeywords": ["list", "of", "missing", "crucial", "keywords"],
  "strengths": ["list", "of", "strong", "points", "matching", "the", "role"],
  "improvements": [
    {
      "originalText": "weak bullet point from resume",
      "suggestedRewrite": "improved ATS-friendly bullet point using action verbs and metrics"
    }
  ]
}
Do not add markdown formatting or wrappers like \`\`\`json. Return only the raw JSON.
`;

export const analyzeResumeAI = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { resumeText, jobDescription, provider = 'gemini' } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ success: false, message: 'Resume text and Job description are required' });
    }

    const prompt = `${SYSTEM_PROMPT}\n\nCandidate Resume:\n"${resumeText}"\n\nTarget Job Description:\n"${jobDescription}"`;

    if (provider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Groq API Key is not configured' });
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      const aiText = result.choices?.[0]?.message?.content;
      return res.status(200).json({ success: true, data: JSON.parse(aiText) });

    } else {
      // Default: Gemini API (supporting AQ. keys)
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Gemini API Key is not configured' });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Clean possible markdown json wrapper block from raw output if present
      let cleanText = aiText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return res.status(200).json({ success: true, data: JSON.parse(cleanText) });
    }
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return handleAiError(error, res, 'AI Analysis failed');
  }
};

const TAILOR_SYSTEM_PROMPT = `
You are an expert resume writer and recruiter. Your goal is to tailor the candidate's resume content (Summary, Skills, Projects, and Achievements) to align perfectly with the target Job Description. 

Modify the text to:
1. Emphasize keywords and core tools mentioned in the Job Description.
2. Use strong action verbs at the start of each project bullet point.
3. Integrate quantifiable metrics and achievements wherever possible.
4. Keep the output formatting identical, using solid bullet points separated by newlines for project descriptions.
5. Achievements should include bold lead-ins like: "**Lead-In Title**: description of achievement".

Return ONLY a valid JSON object matching this structure:
{
  "summary": "A short, impactful professional summary tailored to the role (max 3 sentences)",
  "skills": ["list", "of", "relevant", "skills", "extracted", "from", "both", "user", "skills", "and", "JD"],
  "projects": [
    {
      "id": "project-id-passed-in",
      "description": "First bullet point starting with action verb and metric.\\nSecond bullet point starting with action verb.\\nThird bullet point."
    }
  ],
  "achievements": [
    "**Strong Problem-Solving**: Solved 270+ DSA problems on LeetCode...",
    "**Active Competitive Programmer**: Achieved a rating of..."
  ]
}
Do not add markdown formatting or wrappers like \`\`\`json. Return only the raw JSON.
`;

export const tailorResumeAI = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { resume, jobDescription, provider = 'gemini' } = req.body;

    if (!resume || !jobDescription) {
      return res.status(400).json({ success: false, message: 'Resume data and Job description are required' });
    }

    const prompt = `${TAILOR_SYSTEM_PROMPT}\n\nCandidate Resume State:\n${JSON.stringify(resume, null, 2)}\n\nTarget Job Description:\n"${jobDescription}"`;

    if (provider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Groq API Key is not configured' });
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      const aiText = result.choices?.[0]?.message?.content;
      return res.status(200).json({ success: true, data: JSON.parse(aiText) });

    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Gemini API Key is not configured' });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      let cleanText = aiText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return res.status(200).json({ success: true, data: JSON.parse(cleanText) });
    }
  } catch (error: any) {
    console.error('Tailor AI Error:', error);
    return handleAiError(error, res, 'Auto-tailoring failed');
  }
};

const INSIGHTS_SYSTEM_PROMPT = `
You are an expert software engineering mentor and coding coach.
Analyze the candidate's coding progress data and identify their strong topics, weak topics, and where more effort is required.

Return ONLY a valid JSON object matching this structure:
{
  "strongTopicsAnalysis": "Analyze their strong topics based on the strongPatterns list and difficulty. Acknowledge their mastery (which topics they completed or have >80% accuracy).",
  "weakTopicsAnalysis": "Analyze their weak topics based on the weakPatterns list. Explain exactly what concepts they are struggling with in these patterns (which topics have <30% accuracy).",
  "effortRequiredAnalysis": "Identify where more effort is needed (e.g. transitioning from Easy to Medium, or focusing on specific data structures like Trees, Graphs, DP).",
  "learningTip": "A customized mentorship paragraph focusing on how to bridge their weak patterns and balance difficulty solved.",
  "recommendedPatterns": [
    "Name of Pattern 1: short description of why they need to solve this based on data",
    "Name of Pattern 2: explanation"
  ],
  "actionItems": [
    "Solve 3 Easy problems in [Weak Pattern 1] to understand basic mechanics.",
    "Transition to Medium problems in [Weak Pattern 2] to improve placement prep.",
    "Action item 3..."
  ],
  "careerAngle": "An encouraging statement linking these topic masteries to specific placement or company interview rounds."
}
Do not add markdown formatting or wrappers like \`\`\`json. Return only the raw JSON.
`;

export const getAnalyticsInsightsAI = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { 
      totalSolved,
      totalProblems,
      weakPatterns,
      strongPatterns,
      difficultySolved,
      difficultyTotal,
      sheetsProgress,
      provider = 'gemini' 
    } = req.body;

    const prompt = `
${INSIGHTS_SYSTEM_PROMPT}

Candidate coding progress stats to evaluate:
- Total Solved: ${totalSolved} out of ${totalProblems} total problems.
- Difficulty Breakdown:
  * Easy Solved: ${difficultySolved.Easy || 0} out of ${difficultyTotal.Easy || 0} total.
  * Medium Solved: ${difficultySolved.Medium || 0} out of ${difficultyTotal.Medium || 0} total.
  * Hard Solved: ${difficultySolved.Hard || 0} out of ${difficultyTotal.Hard || 0} total.
- Weak Patterns (<30% completed): ${JSON.stringify(weakPatterns)}
- Strong Patterns (>80% completed): ${JSON.stringify(strongPatterns)}
- Active Sheets Progress: ${JSON.stringify(sheetsProgress)}
`;

    if (provider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Groq API Key is not configured' });
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      const aiText = result.choices?.[0]?.message?.content;
      return res.status(200).json({ success: true, data: JSON.parse(aiText) });

    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Gemini API Key is not configured' });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        const fs = require('fs');
        fs.writeFileSync('debug_gemini_error.txt', `STATUS: ${response.status}\nERROR: ${errText}`);
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      let cleanText = aiText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return res.status(200).json({ success: true, data: JSON.parse(cleanText) });
    }
  } catch (error: any) {
    console.error('Analytics Insights AI Error:', error);
    return handleAiError(error, res, 'Failed to fetch AI Insights');
  }
};
