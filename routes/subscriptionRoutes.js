import express from 'express';
import verifyAuthToken from '../middileware/JwtVerify.js';
import * as purchaseController from '../controllers/subscription.controller.js';

const router = express.Router();

// Purchase-related routes (all require authentication)
router.post('/subscribe', verifyAuthToken, purchaseController.subscribe);
router.post('/purchase', verifyAuthToken, purchaseController.purchase);
router.post("/free-coins", verifyAuthToken, purchaseController.grantFreeCoins);


export default router;