import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Block } from "../models/Block.js";
import { Report } from "../models/Report.js";
import { CallHistory } from "../models/CallHistory.js";
import { Like } from "../models/Like.js";
import { Subscription } from "../models/Subscription.js";
import mongoose from "mongoose";
import crypto from "crypto";
import router from "../routes/userRoutes.js";

// Helper function to generate unique user code
async function generateUserCode() {
  let userCode;
  let isUnique = false;

  while (!isUnique) {
    // Generate a random alphanumeric code (6 characters)
    userCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    // Check if the generated code already exists
    const existingCode = await User.findOne({ user_code: userCode });
    if (!existingCode) {
      isUnique = true;
    }
  }
  return userCode;
}

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

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      relationship_goal,
      refferal_code,
      device_id,
      device_type,
      device_token,
      country,
      mail
    } = req.body;

    // Validate required fields
    const requiredFields = { name, age, gender, relationship_goal, device_id, device_type, device_token, country, mail };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ status: 403, message: `${field} field is required` });
      }
    }

    // Check if user with device_id exists and clean up data
    const existingUser = await User.findOne({ device_id });
    if (existingUser) {
      const userId = existingUser._id;

      await Promise.all([
        CallHistory.deleteMany({ $or: [{ caller: userId }, { receiver: userId }] }),
        Block.deleteMany({ $or: [{ user_id: userId }, { blocked_user_id: userId }] }),
        Report.deleteMany({ $or: [{ user_id: userId }, { reported_user_id: userId }] }),
        User.deleteOne({ device_id }),
      ]);
    }

    const user_code = await generateUserCode();

    const newUser = new User({
      name,
      age,
      gender,
      mail,
      relationship_goal,
      refferal_code,
      device_id,
      device_type,
      device_token,
      country,
      user_type: "user",
      user_code
    });

    const userRecord = await newUser.save();

    // Referral subscription logic
    if (userRecord.refferal_code) {
      const referrer = await User.findOne({ user_code: userRecord.refferal_code });
      if (referrer) {
        const referralSubscription = new Subscription({
          type: "referral",
          cost: 0,
          stars: 10,
          user_id: referrer._id,
          referral_user_id: userRecord._id,
          planName: null,
        });
        await referralSubscription.save();
      }
    }

    const token = jwt.sign(
      { userId: userRecord._id },
      process.env.SECRET_KEY,
      { expiresIn: '365d' }
    );

    return res.status(201).json({
      status: 200,
      message: 'User signed up successfully',
      data: userRecord,
      token
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 500, message: `Server Error: ${err.message}` });
  }
};


// Sign up new user
export const signup = async (req, res) => {
  try {
    const { name, age, gender, relationship_goal, refferal_code, device_id, device_type, device_token, country, mail } = req.body; 
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ status: 403, message: 'name field is required' });
    }
    if(!mail) { 
      return res.status(400).json({ status: 403, message: 'mail field is required' });
    }
    if (!age) {
      return res.status(400).json({ status: 403, message: 'age field is required' });
    }
    if (!gender) {
      return res.status(400).json({ status: 403, message: 'gender field is required' });
    }
    if (!relationship_goal) {
      return res.status(400).json({ status: 403, message: 'relationship_goal field is required' });
    }
    if (!device_type) {
      return res.status(400).json({ status: 403, message: 'device_type field is required' });
    }
    if (!device_id) {
      return res.status(400).json({ status: 403, message: 'device_id field is required' });
    }
    if (!device_token) {
      return res.status(400).json({ status: 403, message: 'device_token field is required' });
    }
    if (!country) {
      return res.status(400).json({ status: 403, message: 'country field is required' });
    }

    // Check if device_id already exists
    const existingUser = await User.findOne({ device_id: device_id });

    if (existingUser) {
      const userId = existingUser._id;
      // Delete call history where the user is either the caller or receiver
      await CallHistory.deleteMany({
        $or: [
          { caller: userId },
          { receiver: userId }
        ]
      });
      
      // Delete block history
      await Block.deleteMany({
        $or: [
          { user_id: userId },
          { blocked_user_id: userId }
        ]
      });
       
      // Delete report history
      await Report.deleteMany({
        $or: [
          { user_id: userId },
          { reported_user_id: userId }
        ]
      });
      
      // Delete the existing user with the same device_id
      await User.deleteOne({ device_id: device_id });
    }
    
    const userCode = await generateUserCode();

    var rec = { 
      name, 
      age, 
      gender,
      mail, 
      relationship_goal, 
      refferal_code, 
      device_id, 
      device_type, 
      device_token, 
      mail,
      user_type: "user",
      country,
      user_code: userCode 
    }; 

    const newuser = new User(rec);
    const userRecord = await newuser.save();
    
    // If referral code exists, create a referral subscription
    if (userRecord.refferal_code !== "" && userRecord.refferal_code !== null) {
      const referrer = await User.findOne({ user_code: userRecord.refferal_code });

      if (referrer) { 
        const referralSubscription = new Subscription({
          type: "referral",
          cost: 0, 
          stars: 10, 
          user_id: referrer._id,
          referral_user_id: userRecord._id,
          planName: null,
        });

        await referralSubscription.save(); 
      }
    }  
        
    const token = jwt.sign(
      { userId: userRecord._id },
      process.env.SECRET_KEY,
      { expiresIn: "365d" }
    );
    
    return res.status(201).json({ 
      status: 200, 
      message: 'User signed up successfully', 
      data: userRecord, 
      token: token 
    });

  } catch (err) {
    console.log(err);
    return res.status(500).send(`Server Error\n${err}`);
  }
};

// Delete user account
export const deleteUser = async (req, res) => {
  try {
    const { device_id } = req.body;
    
    if (!device_id) {
      return res.status(400).json({ status: 403, message: 'device_id field is required' });
    }
    
    const userId = req.user;
    const existingUser = await User.findOne({ device_id: device_id });
    
    if (existingUser) {
      // Delete call history where the user is either the caller or receiver
      await CallHistory.deleteMany({
        $or: [
          { caller: userId },
          { receiver: userId }
        ]
      });
      
      // Delete block history
      await Block.deleteMany({
        $or: [
          { user_id: userId },
          { blocked_user_id: userId }
        ]
      });
      
      // Delete report history
      await Report.deleteMany({
        $or: [
          { user_id: userId },
          { reported_user_id: userId }
        ]
      });
      
      // Delete the existing user with the same device_id
      await User.deleteOne({ device_id: device_id });
      return res.status(201).json({ status: 200, message: 'User deleted successfully' });
    }
    
    return res.status(404).json({ status: 404, message: "User not found." });

  } catch (err) {
    console.log(err);
    return res.status(500).send(`Server Error\n${err}`);
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, age, gender, bio, image, country, mail } = req.body;
    
    const user_id = req.user;
    
    // Define fields to update
    const updateData = {};
    if (name) updateData.name = name;
    if (age) updateData.age = age;
    if (gender) updateData.gender = gender;
    if (bio) updateData.bio = bio;
    if (image) updateData.image = image;
    if (country) updateData.country = country;
    if (mail) updateData.mail = mail;
    
    // Update the user document
    const updatedUser = await User.findByIdAndUpdate(user_id, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Validate the new fields
    });
    
    if (!updatedUser) {
      return res.status(404).json({ status: 404, message: "User not found." });
    }
    
    res.status(200).json({ 
      status: 200, 
      message: "User profile updated successfully.", 
      user: updatedUser 
    });
  } catch (error) {
    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.mail) {
      return res.status(400).json({ 
        status: 400, 
        message: "Email already exists. Please use a different email address." 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        status: 400, 
        message: error.message 
      });
    }
    
    console.error("Error updating user profile:", error);
    res.status(500).json({ status: 500, message: "Internal server error." });
  }
};

// Get own profile
export const getProfile = async (req, res) => {
  try {
    const user_id = new mongoose.Types.ObjectId(req.user);

    // Find the user by ID
    const user = await User.findById(user_id).select('-device_token'); // Exclude fields if needed
    
    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found." });
    }
    
    const totalLikes = await Like.countDocuments({ liked_user_id: user_id });

    // Get total stars (earned)
    const totalStarsResult = await Subscription.aggregate([
      {
        $match: {
          user_id: user_id,
          type: { $in: ["subscription", "manual", "referral", "free"] },
        },
      },
      {
        $group: {
          _id: null,
          totalStars: { $sum: "$stars" },
        },
      },
    ]);
    
    const totalStars = totalStarsResult.length ? totalStarsResult[0].totalStars : 0;
    
    // Get spent stars
    const filterStarsResult = await Subscription.aggregate([
      { 
        $match: { 
          user_id: user_id, 
          type: { $in: ["filter", "filtercall"] } 
        }
      },
      { 
        $group: { 
          _id: "$user_id", 
          filterStars: { $sum: "$stars" } 
        }
      }
    ]);

    const filterStars = filterStarsResult.length ? filterStarsResult[0].filterStars : 0;

    // Calculate adjusted total stars
    const adjustedTotalStars = totalStars - filterStars;
    
    // Get active subscription
    const activeSubscription = await Subscription.findOne({
      user_id: user_id,
      type: "subscription",
      expiry_date: { $gte: new Date() },
    }).sort({ expiry_date: -1 });
     
    res.status(200).json({ 
      status: 200, 
      message: 'User Profile Detail',
      user, 
      totalLikes, 
      totalStars: adjustedTotalStars, 
      activeSubscription: activeSubscription || null 
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ status: 500, message: "Internal server error." });
  }
};

// Get another user's profile
export const getUserProfile = async (req, res) => {
  try {
    const { user_id, mail } = req.body;
    
    // Check if both user_id and mail are provided
    if (!user_id) {
      return res.status(400).json({ status: 400, message: "user_id is required." });
    }
    
    if (!mail) {
      return res.status(400).json({ status: 400, message: "mail is required." });
    }
    
    const loggedInUserId = req.user;
    
    const totalLikes = await Like.countDocuments({ liked_user_id: user_id });
    const isLikedByLoggedInUser = await Like.exists({ user_id: loggedInUserId, liked_user_id: user_id });
    
    // Find the user by ID and mail for additional verification
    const user = await User.findOne({ 
      _id: user_id, 
      mail: mail 
    }).select('-device_token'); // Exclude fields if needed
    
    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found or mail doesn't match." });
    }
    
    res.status(200).json({
      status: 200,
      message: 'User Profile Detail',
      user,
      totalLikes,
      isLikedByLoggedInUser: !!isLikedByLoggedInUser
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ status: 500, message: "Internal server error." });
  }
};

// Get Fser list
export const getUserList = async (req, res) => {
  try {
    const id = req.user;
    
    // Fetch IDs of users blocked by the logged-in user
    const blockedUsers = await Block.find({ user_id: id }).select('blocked_user_id');
    const blockedUserIds = blockedUsers.map(block => block.blocked_user_id);
    
    // Fetch IDs of users who have blocked the logged-in user
    const usersWhoBlockedLoggedInUser = await Block.find({ blocked_user_id: id }).select('user_id');
    const usersWhoBlockedLoggedInUserIds = usersWhoBlockedLoggedInUser.map(block => block.user_id);
    
    // Combine both sets of IDs to exclude from the user list
    const excludeUserIds = [...blockedUserIds, ...usersWhoBlockedLoggedInUserIds];

    const users = await User.find({
      _id: { $ne: new mongoose.Types.ObjectId(id), $nin: excludeUserIds }
    });
    
    const userListWithLikes = await Promise.all(
      users.map(async (user) => {
        // Count total likes for the user
        const totalLikes = await Like.countDocuments({ liked_user_id: user._id });

        // Check if the logged-in user liked this profile
        const isLikedByLoggedInUser = await Like.exists({ user_id: id, liked_user_id: user._id });

        return {
          ...user._doc, // Include all user fields
          totalLikes,
          isLikedByLoggedInUser: !!isLikedByLoggedInUser,
        };
      })
    );
    
    return res.status(200).json({ status: 200, message: 'User list', data: userListWithLikes }); 

  } catch (err) {
    console.log(err);
    return res.status(500).send(`Server Error\n${err}`);
  }
};

// Verify user code
export const verifyUserCode = async (req, res) => {
  try {
    const { user_code } = req.body;

    // Validate input
    if (!user_code) {
      return res.status(400).json({ status: 403, message: "user_code field is required" });
    }

    // Check if the user_code exists in the database
    const user = await User.findOne({ user_code: user_code });

    if (!user) {
      return res.status(404).json({ status: 404, message: "Invalid or non-existent user_code" });
    }

    // Return success response with user data
    return res.status(200).json({
      status: 200,
      message: "user_code is valid",
      data: {
        user_id: user._id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        country: user.country,
        code: user.user_code
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send(`Server Error\n${err}`);
  }
};

// Set filter option
export const setFilterOption = async (req, res) => {
  try {
    const { filter } = req.body;
     
    if (!filter) {
      return res.status(400).json({ status: 403, message: 'filter field is required' });
    }
    
    const userId = req.user;
    const updateData = {};
    updateData.looking_for = filter;
    
    // Update the user document
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Validate the new fields
    });

    if (!updatedUser) {
      return res.status(404).json({ status: 404, message: "User not found." });
    }
    
    const preSubscribe = await Subscription.findOne({ type: "filter", user_id: userId });
    
    if (preSubscribe) {
      // Update existing subscription
      preSubscribe.taken_date = new Date();
      preSubscribe.planName = filter;
      await preSubscribe.save();
    } else {
      // Save subscription	
      const subscription = new Subscription({
        type: "filter",
        cost: 0, 
        stars: 0,
        taken_date: new Date(), 
        user_id: userId,
        planName: filter,
      }); 
      await subscription.save();
    }	
    
    return res.status(201).json({ status: 200, message: "filter option updated successfully." }); 

  } catch (err) {
    console.log(err);
    return res.status(500).send(`Server Error\n${err}`);
  }
};

// controllers/user.controller.js


export const getUserByMail = async (req, res) => {
  try {
    const { mail } = req.params;

    if (!mail) {
      return res.status(400).json({ status: 400, message: 'Email is required.' });
    }

    // Use findOne to get user by mail
    const user = await User.findOne({ mail: mail.toLowerCase().trim() }).select('-device_token');

    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.' });
    }

    res.status(200).json({
      status: 200,
      message: 'User fetched successfully.',
      user
    });
  } catch (error) {
    console.error('Error fetching user by mail:', error);
    res.status(500).json({ status: 500, message: 'Internal server error.' });
  }
};
