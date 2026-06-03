import { Router } from 'express';
import { getProblemById, getDbStats } from '../controllers/problems.controller';

const router = Router();

// Stats endpoint — must come BEFORE /:id to avoid wildcard capture
router.get('/stats', getDbStats);

router.get('/:id', getProblemById);

export default router;
