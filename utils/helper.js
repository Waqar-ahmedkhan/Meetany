import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { Block } from '../models/Block.js';
import crypto from 'crypto';

export async function generateUserCode() {
  let userCode;
  let isUnique = false;
  while (!isUnique) {
    userCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const existingCode = await User.findOne({ user_code: userCode });
    if (!existingCode) {
      isUnique = true;
    }
  }
  return userCode;
}

export async function getUserCurrentStars(userId) {
  try {
    if (typeof userId === 'string') {
      userId = new mongoose.Types.ObjectId(userId);
    }
    const totalStarsResult = await Subscription.aggregate([
      {
        $match: {
          user_id: userId,
          type: { $in: ['subscription', 'manual', 'referral'] },
        },
      },
      {
        $group: {
          _id: null,
          totalStars: { $sum: '$stars' },
        },
      },
    ]);
    const spentStarsResult = await Subscription.aggregate([
      {
        $match: {
          user_id: userId,
          type: { $in: ['filter', 'filtercall'] },
        },
      },
      {
        $group: {
          _id: null,
          spentStars: { $sum: '$stars' },
        },
      },
    ]);
    const earnedStars = totalStarsResult.length ? totalStarsResult[0].totalStars : 0;
    const spentStars = spentStarsResult.length ? spentStarsResult[0].spentStars : 0;
    return Math.max(0, earnedStars - spentStars);
  } catch (error) {
    console.error('Error calculating user stars:', error);
    return 0;
  }
}

export async function manageReferrals(id) {
  try {
    const userRecord = await User.findOne({ _id: id });
    if (!userRecord) {
      console.log('User not found for referral management');
      return 0;
    }
    if (userRecord && userRecord.refferal_code && userRecord.refferal_code !== '') {
      console.log('Processing referral for user:', id, 'with code:', userRecord.refferal_code);
      const preSubscribe = await Subscription.findOne({
        type: 'referral',
        referral_user_id: userRecord._id,
        stars: 10,
      });
      if (!preSubscribe) {
        const referredBy = await User.findOne({
          user_code: userRecord.refferal_code,
        });
        console.log('Referred by user found:', referredBy ? referredBy._id : 'Not found');
        if (referredBy) {
          const referralSubscription = new Subscription({
            type: 'referral',
            cost: 0,
            stars: 10,
            user_id: referredBy._id,
            referral_user_id: userRecord._id,
            planName: 'referral user join the app',
          });
          await referralSubscription.save();
          console.log('Referral bonus saved for:', referredBy._id);
          return 1;
        }
      } else {
        console.log('User already has referral subscription');
      }
    }
    return 0;
  } catch (error) {
    console.error('Error in manageReferrals:', error);
    return -1;
  }
}

export const isUserBlocked = async (userId, targetUserId) => {
  const block = await Block.findOne({
    $or: [
      { user_id: userId, blocked_user_id: targetUserId },
      { user_id: targetUserId, blocked_user_id: userId },
    ],
  });
  return !!block;
};

export const createSubscription = async (userId, referralUserId, planName) => {
  const subscription = new Subscription({
    type: 'filtercall',
    cost: 0,
    stars: 10,
    taken_date: new Date(),
    user_id: userId,
    referral_user_id: referralUserId,
    planName,
  });
  await subscription.save();
};