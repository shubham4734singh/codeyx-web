export interface LocalAtsResult {
  score: number;
  criticalFixes: string[];
  suggestions: string[];
}

export function analyzeResumeLocally(resumeText: string): LocalAtsResult {
  let score = 100;
  const criticalFixes: string[] = [];
  const suggestions: string[] = [];

  const text = resumeText || '';

  // Rule 1: Check contact details & links
  if (!/github\.com/i.test(text)) {
    score -= 15;
    criticalFixes.push("Missing GitHub profile link.");
  }
  if (!/linkedin\.com/i.test(text)) {
    score -= 15;
    criticalFixes.push("Missing LinkedIn profile link.");
  }
  if (!/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(text)) {
    score -= 15;
    criticalFixes.push("Missing a valid email address.");
  }

  // Rule 2: Check for Quantifiable Metrics (numbers, percentages, scales)
  const metricsCount = (text.match(/\b(\d+%|\d+\s*APIs|\d+k\+?\s*users|\$\d+k?|\d+\s*x\s*speedup)\b/g) || []).length;
  if (metricsCount === 0) {
    score -= 15;
    criticalFixes.push("No quantifiable metrics found (e.g. 'improved speed by 30%', 'reduced API latency by 150ms').");
  } else if (metricsCount < 3) {
    score -= 5;
    suggestions.push("Add more numbers/metrics to showcase the impact of your projects.");
  }

  // Rule 3: Check for Action Verbs
  const actionVerbRegex = /\b(designed|built|scaled|automated|optimized|implemented|engineered|integrated|spearheaded|refactored|launched|accelerated)\b/gi;
  const verbsCount = (text.match(actionVerbRegex) || []).length;
  if (verbsCount === 0) {
    score -= 15;
    criticalFixes.push("No strong action verbs found. Start bullet points with verbs like 'Optimized' or 'Engineered'.");
  } else if (verbsCount < 5) {
    score -= 10;
    suggestions.push("Use more action verbs (e.g., replace passive phrases like 'worked on' or 'was responsible for').");
  }

  // Rule 4: Length recommendation (ATS scans prefer 300 - 800 words for single page)
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 100) {
    score -= 15;
    criticalFixes.push("Resume content is too short. Add more project descriptions and skills.");
  } else if (wordCount > 1000) {
    score -= 10;
    suggestions.push("Resume content is extremely long. Try keeping it to a single-page limit (approx. 400-600 words).");
  }

  return {
    score: Math.max(score, 0),
    criticalFixes,
    suggestions
  };
}
