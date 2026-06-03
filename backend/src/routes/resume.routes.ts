import { Router } from 'express';
import { getResumeData, analyzeResumeAI, tailorResumeAI, getAnalyticsInsightsAI } from '../controllers/resume.controller';

const router = Router();

// GET /api/resume - Fetch aggregated profile, stats, and projects
router.get('/', getResumeData);

// POST /api/resume/analyze - Perform deep-scan ATS evaluation
router.post('/analyze', analyzeResumeAI);

// POST /api/resume/tailor - Automatically tailor resume content to a Job Description
router.post('/tailor', tailorResumeAI);

// POST /api/resume/analytics-insights - Generate study plans and mentorship tips from analytics
router.post('/analytics-insights', getAnalyticsInsightsAI);

export default router;
