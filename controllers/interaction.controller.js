// controllers/interaction.controller.js
import { Like } from "../models/Like.js";
import { Block } from "../models/Block.js";
import { Report } from "../models/Report.js";
import { CallHistory } from "../models/CallHistory.js";

// Like/Unlike user
export const likeUser = async (req, res) => {
  try {
    const userId = req.user;
    const { liked_user_id } = req.body;

    if (!liked_user_id) {
      return res.status(400).json({ status: 403, message: "liked_user_id is required." });
    }

    const existingLike = await Like.findOne({ user_id: userId, liked_user_id });

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      return res.status(200).json({ status: 200, message: "User unliked successfully." });
    } else {
      const like = new Like({ user_id: userId, liked_user_id });
      await like.save();
      return res.status(201).json({ status: 200, message: "User liked successfully." });
    }
  } catch (err) {
    console.error("Error in like API:", err);
    return res.status(500).json({ status: 500, message: "Internal server error." });
  }
};

// Block/Unblock user
export const blockUnblockUser = async (req, res) => {
  try {
    const user_id = req.user;
    const { blocked_user_id } = req.body;

    if (!blocked_user_id) {
      return res.status(400).json({ status: 403, message: "blocked_user_id is required." });
    }

    const existingBlock = await Block.findOne({ user_id, blocked_user_id });

    if (existingBlock) {
      await Block.deleteOne({ _id: existingBlock._id });
      return res.status(200).json({ status: 200, message: "User unblocked successfully." });
    } else {
      const block = new Block({ user_id, blocked_user_id });
      await block.save();
      return res.status(201).json({ status: 200, message: "User blocked successfully." });
    }
  } catch (error) {
    console.error("Error in block/unblock API:", error);
    res.status(500).json({ status: 500, message: "Internal server error." });
  }
};

// Get blocked users list
export const getBlockedUsers = async (req, res) => {
  try {
    const user_id = req.user;

    const blockedUsers = await Block.find({ user_id: user_id })
      .populate('blocked_user_id', 'name age gender image country');

    const blockedUserDetails = blockedUsers.map(block => block.blocked_user_id);

    res.status(200).json({ status: 200, message: 'Blocked User list', blockedUsers: blockedUserDetails });
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    res.status(500).json({ status: 500, message: "Internal server error." });
  }
};

// Report user
export const reportUser = async (req, res) => {
  try {
    const user_id = req.user;
    const { reported_user_id, report_reason } = req.body;

    if (!reported_user_id || !report_reason) {
      return res.status(400).json({ status: 400, message: 'reported_user_id and report_reason are required.' });
    }

    const report = new Report({
      user_id,
      reported_user_id,
      report_reason
    });

    await report.save();

    return res.status(201).json({ status: 201, message: 'User reported successfully', data: report });
  } catch (error) {
    console.error("Error in report API:", error);
    return res.status(500).json({ status: 500, message: "Internal server error." });
  }
};

// Get user's reports
export const getMyReports = async (req, res) => {
  try {
    const user_id = req.user;

    let reports = await Report.find({ user_id })
      .populate('reported_user_id', 'name age gender image country')
      .sort({ createdAt: -1 });

    reports = reports.map(report => {
      const reported = report.reported_user_id || {};
      return {
        ...report._doc,
        reported_user_id: {
          _id: reported._id || null,
          name: reported.name || null,
          age: reported.age || null,
          gender: reported.gender || null,
          image: typeof reported.image !== 'undefined' ? reported.image : null,
          country: reported.country || null,
        }
      };
    });

    res.status(200).json({ status: 200, message: 'Report list fetched successfully', data: reports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ status: 500, message: "Internal server error." });
  }
};

// Cancel a report
export const cancelReport = async (req, res) => {
  try {
    const user_id = req.user;
    const { reportId } = req.params;

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({ status: 404, message: 'Report not found' });
    }

    if (report.user_id.toString() !== user_id) {
      return res.status(403).json({ status: 403, message: 'Unauthorized to delete this report' });
    }

    await Report.deleteOne({ _id: reportId });

    res.status(200).json({ status: 200, message: 'Report cancelled successfully' });
  } catch (error) {
    console.error("Error cancelling report:", error);
    res.status(500).json({ status: 500, message: "Internal server error." });
  }
};

// Log a call
export const logCall = async (req, res) => {
  try {
    const caller = req.user;
    const { receiver, status } = req.body;

    if (!receiver || !status) {
      return res.status(400).json({ status: 400, message: 'receiver and status are required.' });
    }

    const callHistory = new CallHistory({ caller, receiver, status });
    await callHistory.save();
    
    res.status(201).json({ 
      status: 200, 
      message: 'Call history logged successfully',
      data: callHistory
    });
  } catch (error) {
    console.error("Error logging call history:", error);
    res.status(500).json({ status: 500, message: 'Error logging call history' });
  }
};

// Update call status and duration
export const updateCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, duration } = req.body;

    const updatedCall = await CallHistory.findByIdAndUpdate(
      id,
      { status, duration },
      { new: true, runValidators: true }
    );

    if (!updatedCall) {
      return res.status(404).json({ status: 404, message: 'Call history not found' });
    }

    res.status(200).json({ 
      status: 200, 
      message: 'Call history updated successfully', 
      data: updatedCall 
    });
  } catch (error) {
    console.error("Error updating call history:", error);
    res.status(500).json({ status: 500, message: 'Error updating call history' });
  }
};

// Get call history
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user;
    
    const callHistory = await CallHistory.find({
      $or: [{ caller: userId }, { receiver: userId }]
    })
    .populate('caller', 'name age gender image country')
    .populate('receiver', 'name age gender image country')
    .sort({ createdAt: -1 });

    res.status(200).json({ status: 200, data: callHistory });
  } catch (error) {
    console.error("Error retrieving call history:", error);
    res.status(500).json({ status: 500, message: 'Error retrieving call history' });
  }
};