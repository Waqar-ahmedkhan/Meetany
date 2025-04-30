// import { Subscription } from "../models/Subscription.js";
// import { User } from "../models/User.js";
// import mongoose from "mongoose";

// // Helper function to calculate user stars
// async function getUserCurrentStars(userId) {
//   try {
//     // Convert userId to ObjectId if it's not already
//     if (typeof userId === 'string') {
//       userId = new mongoose.Types.ObjectId(userId);
//     }
    
//     // Step 1: Get total stars from subscription, manual, and referral types
//     const totalStarsResult = await Subscription.aggregate([
//       {
//         $match: {
//           user_id: userId,
//           type: { $in: ["subscription", "manual", "referral"] },
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           totalStars: { $sum: "$stars" },
//         },
//       },
//     ]);
    
//     // Step 2: Get spent stars from filter and filtercall types
//     const spentStarsResult = await Subscription.aggregate([
//       { 
//         $match: { 
//           user_id: userId, 
//           type: { $in: ["filter", "filtercall"] } 
//         }
//       },
//       { 
//         $group: { 
//           _id: null, 
//           spentStars: { $sum: "$stars" } 
//         }
//       }
//     ]);
    
//     const earnedStars = totalStarsResult.length ? totalStarsResult[0].totalStars : 0;
//     const spentStars = spentStarsResult.length ? spentStarsResult[0].spentStars : 0;
    
//     return Math.max(0, earnedStars - spentStars);
//   } catch (error) {
//     console.error("Error calculating user stars:", error);
//     return 0;
//   }
// }

// // Subscribe to a plan
// export const subscribe = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
  
//   try {
//     const { planName, cost, stars } = req.body;
    
//     if (!planName) {
//       return res.status(403).json({ status: 403, message: 'planName field is required' });
//     }
//     if (!cost) {
//       return res.status(403).json({ status: 403, message: 'cost field is required' });
//     }
//     if (!stars) {
//       return res.status(403).json({ status: 403, message: 'stars field is required' });
//     }
    
//     const userId = req.user; 
//     // Subscription plan details
//     const plans = {
//       weekly: { duration: 7 },
//       monthly: { duration: 30 },
//       quarterly: { duration: 90 },
//     };

//     const plan = plans[planName];
//     if (!plan) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ status: 400, error: "Invalid subscription plan" });
//     }

//     const expiryDate = new Date();
//     expiryDate.setDate(expiryDate.getDate() + plan.duration);
    
//     // Fix: Proper async/await pattern for user referral handling
//     const userRecord = await User.findOne({ _id: userId }).session(session);
    
//     // Process referral bonuses for first-time subscribers
//     if (userRecord && userRecord.refferal_code && userRecord.refferal_code !== "") {
//       const preSubscribe = await Subscription.findOne({ 
//         type: "subscription",
//         user_id: userId 
//       }).session(session);
      
//       if (!preSubscribe) {
//         // Fix: Added await here
//         const referredBy = await User.findOne({ refferal_code: userRecord.refferal_code }).session(session);
        
//         if (referredBy) {
//           console.log("Processing premium referral bonus for:", referredBy._id);
//           const referralSubscription = new Subscription({
//             type: "referral",
//             cost: 0, 
//             stars: 100, 
//             user_id: referredBy._id,
//             referral_user_id: userRecord._id,
//             planName: "referral user takes a premium plan",
//           });

//           await referralSubscription.save({ session });
//           console.log("Premium referral bonus saved");
//         }
//       }
//     } 

//     // Save subscription
//     const subscription = new Subscription({
//       type: "subscription",
//       cost: cost,
//       stars: stars,
//       taken_date: new Date(),
//       expiry_date: expiryDate,
//       user_id: userId,
//       planName,
//     });

//     await subscription.save({ session });
    
//     await session.commitTransaction();
//     session.endSession();
    
//     res.status(201).json({ 
//       status: 200, 
//       message: "Subscription added successfully", 
//       subscription,
//       currentStars: await getUserCurrentStars(userId) 
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     res.status(500).json({ status: 500, error: error.message });
//   }
// };

// // Make a purchase
// app.post("/api/purchase", verifyAuthToken, async (req, res) => {
//   // Start a session for transaction
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { stars, cost } = req.body;
    
//     if (!cost) {
//       return res.status(403).json({ status: 403, message: 'cost field is required' });
//     }
//     if (!stars) {
//       return res.status(403).json({ status: 403, message: 'stars field is required' });
//     }

//     const userId = req.user;
    
//     // Generate a unique transaction ID for idempotency
//     const transactionId = `${userId}-${stars}-${cost}-${Date.now()}`;
    
//     // Check for recent duplicate purchases (within last 30 seconds)
//     const recentPurchase = await Subscription.findOne({
//         user_id: userId,
//         type: "manual",
//         cost: cost,
//         stars: stars,
//         taken_date: { 
//             $gte: new Date(Date.now() - 30000) // 30 seconds ago
//         }
//     }).session(session);
    
//     if (recentPurchase) {
//         console.log("Duplicate purchase detected:", userId, stars, cost);
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(200).json({ 
//             status: 200, 
//             message: "Purchase already processed", 
//             subscription: recentPurchase 
//         });
//     }

//     // Save manual purchase with transaction ID
//     const subscription = new Subscription({
//         type: "manual",
//         cost,
//         stars,
//         taken_date: new Date(),
//         expiry_date: null,
//         user_id: userId,
//         transactionId // Store the transaction ID
//     });

//     await subscription.save({ session });
    
//     // Log the successful purchase
//     console.log("New purchase saved:", userId, stars, cost, "Transaction ID:", transactionId);
    
//     await session.commitTransaction();
//     session.endSession();
    
//     res.status(201).json({ 
//       status: 200, 
//       message: "Manual purchase added successfully", 
//       subscription,
//       currentStars: await getUserCurrentStars(userId) // Get updated star count
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Purchase error:", error);
//     res.status(500).json({ status: 500, error: error.message });
//   }
// });

import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";

// Helper function to calculate user stars
async function getUserCurrentStars(userId) {
  try {
    // Convert userId to ObjectId if it's not already
    if (typeof userId === 'string') {
      userId = new mongoose.Types.ObjectId(userId);
    }
    
    // Step 1: Get total stars from subscription, manual, and referral types
    const totalStarsResult = await Subscription.aggregate([
      {
        $match: {
          user_id: userId,
          type: { $in: ["subscription", "manual", "referral"] },
        },
      },
      {
        $group: {
          _id: null,
          totalStars: { $sum: "$stars" },
        },
      },
    ]);
    
    // Step 2: Get spent stars from filter and filtercall types
    const spentStarsResult = await Subscription.aggregate([
      { 
        $match: { 
          user_id: userId, 
          type: { $in: ["filter", "filtercall"] } 
        }
      },
      { 
        $group: { 
          _id: null, 
          spentStars: { $sum: "$stars" } 
        }
      }
    ]);
    
    const earnedStars = totalStarsResult.length ? totalStarsResult[0].totalStars : 0;
    const spentStars = spentStarsResult.length ? spentStarsResult[0].spentStars : 0;
    
    return Math.max(0, earnedStars - spentStars);
  } catch (error) {
    console.error("Error calculating user stars:", error);
    return 0;
  }
}

// Subscribe to a plan


const PLANS = {
  weekly: { duration: 7 },
  monthly: { duration: 30 },
  quarterly: { duration: 90 },
};

export const subscribe = async (req, res) => {
  try {
    const { planName, cost, stars, transactionId } = req.body;
    const userId = req.user;

    if (!planName || !PLANS[planName]) {
      return res.status(400).json({ status: 400, message: "Invalid or missing planName" });
    }
    if (!cost || !stars) {
      return res.status(400).json({ status: 400, message: "cost and stars are required" });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + PLANS[planName].duration);
    const txnId = transactionId || `sub-${userId}-${Date.now()}`;

    // Prevent duplicate subscription
    const existing = await Subscription.findOne({ transactionId: txnId });
    if (existing) {
      return res.status(200).json({
        status: 200,
        message: "Subscription already processed",
        subscription: existing,
      });
    }

    const subscription = new Subscription({
      type: "subscription",
      cost,
      stars,
      taken_date: new Date(),
      expiry_date: expiryDate,
      user_id: userId,
      planName,
      transactionId: txnId,
    });

    await subscription.save();

    // Optional: Referral Bonus
    const user = await User.findById(userId);
    if (user?.refferal_code) {
      const referrer = await User.findOne({ refferal_code: user.refferal_code });
      const alreadyReferred = await Subscription.findOne({ user_id: userId, type: "subscription" });
      if (referrer && !alreadyReferred) {
        await Subscription.create({
          type: "referral",
          cost: 0,
          stars: 100,
          user_id: referrer._id,
          referral_user_id: userId,
          planName: "Referral bonus",
        });
      }
    }

    res.status(201).json({
      status: 200,
      message: "Subscription added",
      subscription,
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ status: 500, error: error.message });
  }
};

// Make a purchase
export const purchase = async (req, res) => {
  try {
    const { cost, stars, transactionId } = req.body;
    const userId = req.user;

    if (!cost || !stars) {
      return res.status(400).json({ status: 400, message: "cost and stars are required" });
    }

    const txnId = transactionId || `purchase-${userId}-${Date.now()}`;

    const existing = await Subscription.findOne({ transactionId: txnId });
    if (existing) {
      return res.status(200).json({
        status: 200,
        message: "Purchase already processed",
        subscription: existing,
      });
    }

    const subscription = new Subscription({
      type: "manual",
      cost,
      stars,
      taken_date: new Date(),
      expiry_date: null,
      user_id: userId,
      transactionId: txnId,
    });

    await subscription.save();

    res.status(201).json({
      status: 200,
      message: "Manual purchase successful",
      subscription,
    });
  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({ status: 500, error: error.message });
  }
};



// Grant free coins API
export const grantFreeCoins = async (req, res) => {
  try {
    const { stars, reason, transactionId } = req.body;
    const userId = req.user;

    if (!stars || stars <= 0) {
      return res.status(400).json({ status: 400, message: "stars must be a positive number" });
    }

    const txnId = transactionId || `free-${userId}-${Date.now()}`;

    // Check if transactionId already exists to prevent double-granting
    const existing = await Subscription.findOne({ transactionId: txnId });
    if (existing) {
      return res.status(200).json({
        status: 200,
        message: "Free coins already granted",
        subscription: existing,
      });
    }

    const subscription = new Subscription({
      type: "free",
      cost: 0, // free
      stars,
      taken_date: new Date(),
      expiry_date: null,
      user_id: userId,
      transactionId: txnId,
      planName: reason || "Free coins reward", // optional: why they got free coins
    });

    await subscription.save();

    res.status(201).json({
      status: 200,
      message: "Free coins granted successfully",
      subscription,
    });
  } catch (error) {
    console.error("Grant free coins error:", error);
    res.status(500).json({ status: 500, error: error.message });
  }
};


// Make sure to add this in your routes file:
// app.post("/api/purchase", verifyAuthToken, purchase);



