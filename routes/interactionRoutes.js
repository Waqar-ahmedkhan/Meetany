import express from 'express';
import verifyAuthToken from '../middileware/JwtVerify.js';
import * as interactionController from '../controllers/interaction.controller.js';

const router = express.Router();

// User interactions (all require authentication)
router.post('/like', verifyAuthToken, interactionController.likeUser);
router.post('/block-unblock', verifyAuthToken, interactionController.blockUnblockUser);
router.get('/blocked-users', verifyAuthToken, interactionController.getBlockedUsers);

router.post('/report', verifyAuthToken, interactionController.reportUser);
router.get('/my-reports', verifyAuthToken, interactionController.getMyReports);
router.delete('/report/:reportId', verifyAuthToken, interactionController.cancelReport);

router.post('/call/log', verifyAuthToken, interactionController.logCall);
router.post('/call/update/:id', verifyAuthToken, interactionController.updateCall);
router.get('/call/history', verifyAuthToken, interactionController.getCallHistory);

export default router;
