import { Like } from "../models/Like.js";
import { Block } from "../models/Block.js";
import { Report } from "../models/Report.js";

// Like/Unlike user
export const likeUser = async (req, res) => {
  try {
    const userId = req.user;
    const { liked_user_id } = req.body;

    if (!liked_user_id) {
      return res.status(400).json({ status: 403, message: "liked_user_id is required." });
    }

    // Check if the user already liked the profile
    const existingLike = await Like.findOne({ user_id: userId, liked_user_id });

    if (existingLike) {
      // Unlike the user
      await Like.deleteOne({ _id: existingLike._id });
      return res.status(200).json({ status: 200, message: "User unliked successfully." });
    } else {
      // Like the user
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

    // Ensure both user IDs are provided
    if (!blocked_user_id) {
      return res.status(400).json({ status: 403, message: "blocked_user_id is required." });
    }

    // Check if the block entry already exists
    const existingBlock = await Block.findOne({ user_id, blocked_user_id });

    if (existingBlock) {
      // Unblock the user
      await Block.deleteOne({ _id: existingBlock._id });
      return res.status(200).json({ status: 200, message: "User unblocked successfully." });
    } else {
      // Block the user
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

    // Find all blocked users by the logged-in user
    const blockedUsers = await Block.find({ user_id: user_id })
      .populate('blocked_user_id', 'name age gender image country'); // Select fields from the User model as needed

    // Extract and format the blocked user details
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

    // Validate required fields
    if (!reported_user_id || !report_reason) {
      return res.status(400).json({ status: 400, message: 'reported_user_id and report_reason are required.' });
    }

    // Create a new report entry
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



export const getMyReports = async (req, res) => {
  try {
    const user_id = req.user;

    const reports = await Report.find({ user_id })
      .populate('reported_user_id', 'name age gender image country')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 200, message: 'Report list fetched successfully', data: reports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ status: 500, message: "Internal server error." });
  }
};



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




// app.post('/api/call/log', verifyAuthToken, async (req, res) => {
//   const { caller, receiver, callType, status } = req.body;
//   try {
//     const callHistory = new CallHistory({ caller, receiver, status });
//     await callHistory.save();
//     res.status(201).json({ status: 200, message: 'Call history logged successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ status: 500, message: 'Error logging call history' });
//   }
// });

// // Update status and duration of a call history entry
// app.post('/api/call/update/:id', verifyAuthToken, async (req, res) => {
//   const { id } = req.params;
//   const { status, duration } = req.body;

//   try {
//     // Find the call history entry by ID and update the fields
//     const updatedCall = await CallHistory.findByIdAndUpdate(
//       id,
//       { status, duration },
//       { new: true, runValidators: true }
//     );

//     // Check if the call history entry exists
//     if (!updatedCall) {
//       return res.status(404).json({ status: 404, message: 'Call history not found' });
//     }

//     res.status(200).json({ status: 200, message: 'Call history updated successfully', data: updatedCall });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ status: 500, message: 'Error updating call history' });
//   }
// });


// // Fetch call history for a user
// app.get('/api/call/history', verifyAuthToken, async (req, res) => {
//   try {
//     const  userId  = req.user;
//     const callHistory = await CallHistory.find({
//       $or: [{ caller: userId }, { receiver: userId }]
//     }).populate('caller receiver', 'name age gender image country');
//     res.status(200).json({ status: 200, data: callHistory });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ status: 500, message: 'Error retrieving call history' });
//   }
// });
