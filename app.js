import http from "http";
import { Server as SocketIO } from "socket.io";
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { Block } from "./models/Block.js";
import { User } from "./models/User.js";
import { Subscription } from "./models/Subscription.js";
import { CallHistory } from "./models/CallHistory.js";
import { Message } from "./models/Message.js";
import multer from "multer";
import crypto from "crypto";
import connectDB from "./config/Database.js";
import userRoute from "./routes/userRoutes.js";
import subscriptionRoute from "./routes/subscriptionRoutes.js";
import interactionRoute from "./routes/interactionRoutes.js";
import authRoute from "./routes/auth.js";
import messageRoute from "./routes/messagesRoutes.js";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "./config/passport.js";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DB_URL }),
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Routes
app.use("/api", userRoute);
app.use("/api", subscriptionRoute);
app.use("/api", interactionRoute);
app.use("/api/auth", authRoute);
app.use("/api", messageRoute);

app.use("/images", express.static("uploads"));
app.get("/images/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const imageUrl = `/images/${fileName}`;
  res.redirect(imageUrl);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ status: 500, message: `Server Error: ${err.message}` });
});

// Connect to MongoDB
connectDB();

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const users = [];
let ongoingCalls = [];

async function getUserCurrentStars(userId) {
  try {
    if (typeof userId === "string") {
      userId = new mongoose.Types.ObjectId(userId);
    }
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
    const spentStarsResult = await Subscription.aggregate([
      {
        $match: {
          user_id: userId,
          type: { $in: ["filter", "filtercall"] },
        },
      },
      {
        $group: {
          _id: null,
          spentStars: { $sum: "$stars" },
        },
      },
    ]);
    const earnedStars = totalStarsResult.length
      ? totalStarsResult[0].totalStars
      : 0;
    const spentStars = spentStarsResult.length
      ? spentStarsResult[0].spentStars
      : 0;
    return Math.max(0, earnedStars - spentStars);
  } catch (error) {
    console.error("Error calculating user stars:", error);
    return 0;
  }
}

async function manageReferrals(id) {
  try {
    const userRecord = await User.findOne({ _id: id });
    if (!userRecord) {
      console.log("User not found for referral management");
      return 0;
    }
    if (
      userRecord &&
      userRecord.refferal_code &&
      userRecord.refferal_code !== ""
    ) {
      console.log(
        "Processing referral for user:",
        id,
        "with code:",
        userRecord.refferal_code
      );
      const preSubscribe = await Subscription.findOne({
        type: "referral",
        referral_user_id: userRecord._id,
        stars: 10,
      });
      if (!preSubscribe) {
        const referredBy = await User.findOne({
          user_code: userRecord.refferal_code,
        });
        console.log(
          "Referred by user found:",
          referredBy ? referredBy._id : "Not found"
        );
        if (referredBy) {
          const referralSubscription = new Subscription({
            type: "referral",
            cost: 0,
            stars: 10,
            user_id: referredBy._id,
            referral_user_id: userRecord._id,
            planName: "referral user join the app",
          });
          await referralSubscription.save();
          console.log("Referral bonus saved for:", referredBy._id);
          return 1;
        }
      } else {
        console.log("User already has referral subscription");
      }
    }
    return 0;
  } catch (error) {
    console.error("Error in manageReferrals:", error);
    return -1;
  }
}

async function generateUserCode() {
  let userCode;
  let isUnique = false;
  while (!isUnique) {
    userCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const existingCode = await User.findOne({ user_code: userCode });
    if (!existingCode) {
      isUnique = true;
    }
  }
  return userCode;
}

const isUserBlocked = async (userId, targetUserId) => {
  const block = await Block.findOne({
    $or: [
      { user_id: userId, blocked_user_id: targetUserId },
      { user_id: targetUserId, blocked_user_id: userId },
    ],
  });
  return !!block;
};

const createSubscription = async (userId, referralUserId, planName) => {
  const subscription = new Subscription({
    type: "filtercall",
    cost: 0,
    stars: 10,
    taken_date: new Date(),
    user_id: userId,
    referral_user_id: referralUserId,
    planName,
  });
  await subscription.save();
};

const findAvailableUser = async (currentUserId, currentUserGender) => {
  console.log("Finding available user for:", currentUserId);
  if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
    console.error("Invalid currentUserId:", currentUserId);
    return null;
  }
  const preSubscribe = await Subscription.findOne({
    type: "filter",
    user_id: currentUserId,
  });
  for (const user of users) {
    if (user.uniqueID === currentUserId) continue;
    if (preSubscribe && preSubscribe.planName !== user.gender) continue;
    const userSubscribe = await Subscription.findOne({
      type: "filter",
      user_id: user.uniqueID,
    });
    if (userSubscribe && userSubscribe.planName !== currentUserGender) continue;
    const isInCall = ongoingCalls.some(
      (call) => call.caller === user.uniqueID || call.receiver === user.uniqueID
    );
    if (isInCall) continue;
    const isBlocked = await isUserBlocked(currentUserId, user.uniqueID);
    if (isBlocked) continue;
    return user;
  }
  return null;
};

const findUser = (uniqueID) => {
  return users.find((user) => user.uniqueID === uniqueID);
};

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("message", async (message) => {
    console.log("Received message:", message);
    let data;
    try {
      if (typeof message === "string") {
        data = JSON.parse(message);
      } else {
        data = message;
      }
    } catch (err) {
      console.error("Invalid message format:", message);
      socket.emit("message", {
        type: "error",
        message: "Invalid message format",
      });
      return;
    }

    // Skip uniqueID validation for send_message
    if (data.type !== "send_message") {
      if (!data.uniqueID || !mongoose.Types.ObjectId.isValid(data.uniqueID)) {
        console.error("Invalid or missing uniqueID:", data.uniqueID);
        socket.emit("message", {
          type: "error",
          message: "Invalid or missing uniqueID",
        });
        return;
      }
    }

    switch (data.type) {
      case "store_user":
        console.log("Handling store_user");
        if (findUser(data.uniqueID)) {
          socket.emit("message", {
            type: "user_already_exists",
            message: "User already exists",
          });
          return;
        }
        const newUser = {
          name: data.name,
          id: socket.id,
          uniqueID: data.uniqueID,
          gender: data.gender,
        };
        users.push(newUser);
        console.log("User stored:", newUser);
        const availableUser = await findAvailableUser(data.uniqueID, data.gender);
        const callId = new mongoose.Types.ObjectId().toString();
        if (availableUser) {
          ongoingCalls.push({
            caller: data.uniqueID,
            receiver: availableUser.uniqueID,
            callId,
          });
          socket.emit("message", {
            type: "call_connected",
            data: availableUser.uniqueID,
            name: availableUser.name,
            gender: availableUser.gender,
            callId,
          });
          io.to(availableUser.id).emit("message", {
            type: "call_connected",
            data: data.uniqueID,
            name: data.name,
            gender: data.gender,
            callId,
          });
        } else {
          socket.emit("message", {
            type: "call_connected",
            data: "No available user for the call",
            name: "",
            gender: "",
            callId: null,
          });
        }
        break;

      case "start_call":
        console.log("Handling start_call");
        const userToCall = findUser(data.uniqueID);
        if (userToCall) {
          socket.emit("message", {
            type: "call_response",
            data: "User is ready for call",
          });
        } else {
          socket.emit("message", {
            type: "call_response",
            data: "User is not online",
          });
        }
        break;

      case "create_offer":
        console.log("Handling create_offer");
        const userToReceiveOffer = findUser(data.uniqueID);
        if (!mongoose.Types.ObjectId.isValid(data.callerId)) {
          console.error("Invalid callerId:", data.callerId);
          socket.emit("message", {
            type: "error",
            message: "Invalid caller ID format",
          });
          return;
        }
        if (!mongoose.Types.ObjectId.isValid(data.targetId)) {
          console.error("Invalid targetId:", data.targetId);
          socket.emit("message", {
            type: "error",
            message: "Invalid receiver ID format",
          });
          return;
        }
        if (!data.data || !data.data.sdp || typeof data.data.sdp !== "string") {
          console.error("Invalid or missing SDP:", data.data);
          socket.emit("message", {
            type: "error",
            message: "Invalid or missing SDP in offer",
          });
          return;
        }
        try {
          const callLog = new CallHistory({
            caller: new mongoose.Types.ObjectId(data.callerId),
            receiver: new mongoose.Types.ObjectId(data.targetId),
            status: "missed",
            callId: data.callId, // Use provided callId
          });
          const call = await callLog.save();
          if (userToReceiveOffer) {
            io.to(userToReceiveOffer.id).emit("message", {
              type: "offer_received",
              name: userToReceiveOffer.name,
              uniqueID: userToReceiveOffer.uniqueID,
              callerId: data.callerId,
              data: data.data.sdp,
              callId: data.callId, // Use consistent callId
            });
          } else {
            socket.emit("message", {
              type: "error",
              message: "Receiver is not online",
            });
          }
        } catch (err) {
          console.error("Error saving call log:", err);
          socket.emit("message", {
            type: "error",
            message: "Failed to initiate call",
            details: err.message,
          });
        }
        break;

      case "create_answer":
        console.log("Handling create_answer");
        const userToReceiveAnswer = findUser(data.uniqueID);
        if (!userToReceiveAnswer) {
          socket.emit("message", {
            type: "error",
            message: "Receiver is not online",
          });
          return;
        }
        if (!data.data || !data.data.sdp || typeof data.data.sdp !== "string") {
          console.error("Invalid or missing SDP:", data.data);
          socket.emit("message", {
            type: "error",
            message: "Invalid or missing SDP in answer",
          });
          return;
        }
        const isInCall = ongoingCalls.find(
          (call) =>
            call.caller === data.uniqueID || call.receiver === data.uniqueID
        );
        if (isInCall) {
          const callerGender = findUser(isInCall.caller);
          const receiverGender = findUser(isInCall.receiver);
          const caller = await Subscription.findOne({
            type: "filter",
            user_id: isInCall.caller,
          });
          if (
            caller &&
            caller.planName !== "both" &&
            receiverGender?.gender !== "both" &&
            caller.planName === receiverGender?.gender
          ) {
            await createSubscription(
              isInCall.caller,
              isInCall.receiver,
              caller.planName
            );
          }
          const receiver = await Subscription.findOne({
            type: "filter",
            user_id: isInCall.receiver,
          });
          if (
            receiver &&
            receiver.planName !== "both" &&
            callerGender?.gender !== "both" &&
            receiver.planName === callerGender?.gender
          ) {
            await createSubscription(
              isInCall.receiver,
              isInCall.caller,
              receiver.planName
            );
          }
          await CallHistory.findOneAndUpdate(
            { callId: data.callId },
            { status: "connected" }
          );
        }
        io.to(userToReceiveAnswer.id).emit("message", {
          type: "answer_received",
          name: data.name,
          data: data.data.sdp,
          callId: data.callId,
        });
        break;

      case "ice_candidate":
        console.log("Handling ice_candidate:", data);
        const userToReceiveIceCandidate = findUser(data.uniqueID);
        if (userToReceiveIceCandidate) {
          io.to(userToReceiveIceCandidate.id).emit("message", {
            type: "ice_candidate",
            name: data.name,
            data: {
              sdpMLineIndex: data.data.sdpMLineIndex,
              sdpMid: data.data.sdpMid,
              sdpCandidate: data.data.sdpCandidate,
            },
          });
        } else {
          console.error("User not found for ICE candidate:", data.uniqueID);
          socket.emit("message", {
            type: "error",
            message: "Receiver not online for ICE candidate",
          });
        }
        break;

      case "end_call":
        console.log("Handling end_call");
        const userToEndCall = findUser(data.uniqueID);
        if (userToEndCall) {
          io.to(userToEndCall.id).emit("message", {
            type: "call_ended",
            name: data.name,
            data: "Call ended",
          });
        }
        const callIndex = ongoingCalls.findIndex(
          (call) =>
            call.caller === data.uniqueID || call.receiver === data.uniqueID
        );
        if (callIndex !== -1) {
          const call = ongoingCalls[callIndex];
          await CallHistory.findOneAndUpdate(
            { callId: call.callId },
            { status: "ended" }
          );
          ongoingCalls.splice(callIndex, 1);
        }
        const nextAvailableUser = await findAvailableUser(
          data.uniqueID,
          data.gender
        );
        const nextCallId = new mongoose.Types.ObjectId().toString();
        if (!nextAvailableUser) {
          socket.emit("message", {
            type: "call_connected",
            data: "No available user for the next call",
            name: "",
            gender: "",
            callId: null,
          });
        } else {
          ongoingCalls.push({
            caller: data.uniqueID,
            receiver: nextAvailableUser.uniqueID,
            callId: nextCallId,
          });
          socket.emit("message", {
            type: "call_connected",
            data: nextAvailableUser.uniqueID,
            name: nextAvailableUser.name,
            gender: nextAvailableUser.gender,
            callId: nextCallId,
          });
          io.to(nextAvailableUser.id).emit("message", {
            type: "call_connected",
            data: data.uniqueID,
            name: data.name,
            gender: data.gender,
            callId: nextCallId,
          });
        }
        break;

      case "send_message":
        console.log("Handling send_message:", data);
        const { callId: messageCallId, content, senderId, receiverId } = data;
        if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
          console.error("Invalid senderId or receiverId:", { senderId, receiverId });
          socket.emit("message", {
            type: "message_error",
            data: "Invalid sender or receiver ID",
          });
          return;
        }
        if (!messageCallId || !content) {
          console.error("Missing callId or content:", { callId: messageCallId, content });
          socket.emit("message", {
            type: "message_error",
            data: "Missing call ID or message content",
          });
          return;
        }
        const sender = findUser(senderId);
        const receiver = findUser(receiverId);
        if (!sender || sender.id !== socket.id) {
          console.error("Sender not found or socket mismatch:", senderId);
          socket.emit("message", {
            type: "message_error",
            data: "Sender not found or unauthorized",
          });
          return;
        }
        const isInCallForMessage = ongoingCalls.find(
          (call) =>
            (call.caller === senderId && call.receiver === receiverId) ||
            (call.caller === receiverId && call.receiver === senderId)
        );
        if (!isInCallForMessage || isInCallForMessage.callId !== messageCallId) {
          console.error("No active call found or callId mismatch:", { senderId, receiverId, callId: messageCallId });
          socket.emit("message", {
            type: "message_error",
            data: "No active call found or invalid call ID",
          });
          return;
        }
        if (!receiver) {
          console.error("Receiver not online:", receiverId);
          socket.emit("message", {
            type: "message_error",
            data: "Receiver is not online",
          });
          return;
        }
        try {
          const message = new Message({
            call_id: new mongoose.Types.ObjectId(messageCallId),
            sender_id: senderId,
            receiver_id: receiverId,
            content,
          });
          await message.save();
          io.to(receiver.id).emit("message", {
            type: "message_received",
            callId: messageCallId,
            senderId,
            senderName: sender.name,
            content,
            timestamp: message.timestamp,
          });
          socket.emit("message", {
            type: "message_sent",
            callId: messageCallId,
            senderId,
            senderName: sender.name,
            content,
            timestamp: message.timestamp,
          });
        } catch (error) {
          console.error("Error saving message:", error);
          socket.emit("message", {
            type: "message_error",
            data: "Failed to send message",
            details: error.message,
          });
        }
        break;

      default:
        console.error("Unknown message type:", data.type);
        socket.emit("message", {
          type: "error",
          message: "Unknown message type",
        });
    }
  });

  socket.on("disconnect", async () => {
    const userIndex = users.findIndex((user) => user.id === socket.id);
    let disconnectedUser = null;
    if (userIndex !== -1) {
      disconnectedUser = users.splice(userIndex, 1)[0];
    }
    const callIndex = ongoingCalls.findIndex(
      (call) =>
        call.caller === disconnectedUser?.uniqueID ||
        call.receiver === disconnectedUser?.uniqueID
    );
    if (callIndex !== -1) {
      const call = ongoingCalls[callIndex];
      const partnerId = call.caller === disconnectedUser?.uniqueID ? call.receiver : call.caller;
      const partner = findUser(partnerId);
      if (partner) {
        io.to(partner.id).emit("message", {
          type: "call_ended",
          name: disconnectedUser?.name || "Unknown",
          data: "User disconnected",
        });
      }
      await CallHistory.findOneAndUpdate(
        { callId: call.callId },
        { status: "ended" }
      );
      ongoingCalls.splice(callIndex, 1);
    }
    console.log(
      `Cleaned up: Removed user ${
        disconnectedUser?.name || "unknown"
      } from users and ongoing calls.`
    );
    console.log("Connection closed:", socket.id);
  });
});

// Start server
server.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening on port ${process.env.PORT || 3000}`);
});

// import http from 'http';
// import { Server as SocketIO } from 'socket.io';
// import express from 'express';
// import mongoose from 'mongoose';
// import bodyParser from 'body-parser';
// import { Block } from './models/Block.js';
// import { User } from './models/User.js';
// import { Subscription } from './models/Subscription.js';
// import { CallHistory } from './models/CallHistory.js';
// import multer from 'multer';
// import crypto from 'crypto';
// import connectDB from './config/Database.js';
// import userRoute from './routes/userRoutes.js';
// import subscriptionRoute from './routes/subscriptionRoutes.js';
// import interactionRoute from './routes/interactionRoutes.js';
// import authRoute from './routes/auth.js';
// import session from 'express-session';
// import MongoStore from 'connect-mongo';
// import passport from './config/passport.js';

// // Multer configuration
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads');
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + '-' + file.originalname);
//   },
// });

// const upload = multer({ storage: storage });

// const app = express();

// // Middleware
// app.use(express.json());
// app.use(bodyParser.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({ mongoUrl: process.env.DB_URL }),
//     cookie: { secure: process.env.NODE_ENV === 'production' },
//   })
// );
// app.use(passport.initialize());
// app.use(passport.session());
// import cors from 'cors';
// app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
// // Routes
// app.use('/api', userRoute);
// app.use('/api', subscriptionRoute);
// app.use('/api', interactionRoute);
// app.use('/api/auth', authRoute);

// app.use('/images', express.static('uploads'));
// app.get('/images/:fileName', (req, res) => {
//   const fileName = req.params.fileName;
//   const imageUrl = `/images/${fileName}`;
//   res.redirect(imageUrl);
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ status: 500, message: `Server Error: ${err.message}` });
// });

// // Connect to MongoDB
// connectDB();

// // Create HTTP server
// const server = http.createServer(app);

// // Initialize Socket.IO
// const io = new SocketIO(server);

// const users = [];
// let ongoingCalls = [];

// async function getUserCurrentStars(userId) {
//   try {
//     if (typeof userId === 'string') {
//       userId = new mongoose.Types.ObjectId(userId);
//     }
//     const totalStarsResult = await Subscription.aggregate([
//       {
//         $match: {
//           user_id: userId,
//           type: { $in: ['subscription', 'manual', 'referral'] },
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           totalStars: { $sum: '$stars' },
//         },
//       },
//     ]);
//     const spentStarsResult = await Subscription.aggregate([
//       {
//         $match: {
//           user_id: userId,
//           type: { $in: ['filter', 'filtercall'] },
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           spentStars: { $sum: '$stars' },
//         },
//       },
//     ]);
//     const earnedStars = totalStarsResult.length ? totalStarsResult[0].totalStars : 0;
//     const spentStars = spentStarsResult.length ? spentStarsResult[0].spentStars : 0;
//     return Math.max(0, earnedStars - spentStars);
//   } catch (error) {
//     console.error('Error calculating user stars:', error);
//     return 0;
//   }
// }

// async function manageReferrals(id) {
//   try {
//     const userRecord = await User.findOne({ _id: id });
//     if (!userRecord) {
//       console.log('User not found for referral management');
//       return 0;
//     }
//     if (userRecord && userRecord.refferal_code && userRecord.refferal_code !== '') {
//       console.log('Processing referral for user:', id, 'with code:', userRecord.refferal_code);
//       const preSubscribe = await Subscription.findOne({
//         type: 'referral',
//         referral_user_id: userRecord._id,
//         stars: 10,
//       });
//       if (!preSubscribe) {
//         const referredBy = await User.findOne({
//           user_code: userRecord.refferal_code,
//         });
//         console.log('Referred by user found:', referredBy ? referredBy._id : 'Not found');
//         if (referredBy) {
//           const referralSubscription = new Subscription({
//             type: 'referral',
//             cost: 0,
//             stars: 10,
//             user_id: referredBy._id,
//             referral_user_id: userRecord._id,
//             planName: 'referral user join the app',
//           });
//           await referralSubscription.save();
//           console.log('Referral bonus saved for:', referredBy._id);
//           return 1;
//         }
//       } else {
//         console.log('User already has referral subscription');
//       }
//     }
//     return 0;
//   } catch (error) {
//     console.error('Error in manageReferrals:', error);
//     return -1;
//   }
// }

// async function generateUserCode() {
//   let userCode;
//   let isUnique = false;
//   while (!isUnique) {
//     userCode = crypto.randomBytes(3).toString('hex').toUpperCase();
//     const existingCode = await User.findOne({ user_code: userCode });
//     if (!existingCode) {
//       isUnique = true;
//     }
//   }
//   return userCode;
// }

// const isUserBlocked = async (userId, targetUserId) => {
//   const block = await Block.findOne({
//     $or: [
//       { user_id: userId, blocked_user_id: targetUserId },
//       { user_id: targetUserId, blocked_user_id: userId },
//     ],
//   });
//   return !!block;
// };

// const createSubscription = async (userId, referralUserId, planName) => {
//   const subscription = new Subscription({
//     type: 'filtercall',
//     cost: 0,
//     stars: 10,
//     taken_date: new Date(),
//     user_id: userId,
//     referral_user_id: referralUserId,
//     planName,
//   });
//   await subscription.save();
// };

// const findAvailableUser = async (currentUserId, currentUserGender) => {
//   console.log('currentUserId +++', currentUserId);
//   if (currentUserId === '') {
//     return null;
//   }
//   const preSubscribe = await Subscription.findOne({
//     type: 'filter',
//     user_id: currentUserId,
//   });
//   for (const user of users) {
//     if (user.uniqueID === currentUserId) continue;
//     if (preSubscribe && preSubscribe.planName !== user.gender) continue;
//     const userSubscribe = await Subscription.findOne({
//       type: 'filter',
//       user_id: user.uniqueID,
//     });
//     if (userSubscribe && userSubscribe.planName !== currentUserGender) continue;
//     const isInCall = ongoingCalls.some(
//       (call) => call.caller === user.uniqueID || call.receiver === user.uniqueID
//     );
//     if (isInCall) continue;
//     const isBlocked = await isUserBlocked(currentUserId, user.uniqueID);
//     if (isBlocked) continue;
//     return user;
//   }
//   return null;
// };

// const findUser = (uniqueID) => {
//   return users.find((user) => user.uniqueID === uniqueID);
// };

// // Socket.IO logic
// io.on('connection', (socket) => {
//   console.log('new connection>>>', socket.id);

//   socket.on('message', async (message) => {
//     console.log('new message>>>', message);
//     let data;
//     try {
//       data = JSON.parse(message);
//     } catch (err) {
//       console.error('Invalid message format:', message);
//       return;
//     }
//     console.log('parse message>>>', data);
//     const user = findUser(data.uniqueID);

//     switch (data.type) {
//       case 'store_user':
//         console.log('new store_user>>>');
//         if (user) {
//           socket.emit('message', {
//             type: 'user already exists',
//           });
//           return;
//         }
//         const newUser = {
//           name: data.name,
//           id: socket.id,
//           uniqueID: data.uniqueID,
//           gender: data.gender,
//         };
//         users.push(newUser);
//         const availableUser = await findAvailableUser(data.uniqueID, data.gender);
//         console.log('availableUser>>>', availableUser);
//         if (availableUser) {
//           ongoingCalls.push({
//             caller: data.uniqueID,
//             receiver: availableUser.uniqueID,
//           });
//           socket.emit('message', {
//             type: 'call_connected',
//             data: availableUser.uniqueID,
//             name: availableUser.name,
//             gender: availableUser.gender,
//           });
//         } else {
//           socket.emit('message', {
//             type: 'call_connected',
//             data: 'No available user for the call',
//             name: '',
//             gender: '',
//           });
//         }
//         break;

//       case 'start_call':
//         console.log('new start_call>>>');
//         let userToCall = findUser(data.uniqueID);
//         if (userToCall) {
//           socket.emit('message', {
//             type: 'call_response',
//             data: 'user is ready for call',
//           });
//         } else {
//           socket.emit('message', {
//             type: 'call_response',
//             data: 'user is not online',
//           });
//         }
//         break;

//       case 'create_offer':
//         console.log('new create_offer>>>');
//         let userToReceiveOffer = findUser(data.uniqueID);
//         const callLog = new CallHistory({
//           caller: data.callerId,
//           receiver: data.targetId,
//           status: 'missed',
//         });
//         const call = await callLog.save();
//         console.log('userToReceiveOffer>>>', userToReceiveOffer);
//         if (userToReceiveOffer) {
//           console.log('enter>>>');
//           io.to(userToReceiveOffer.id).emit('message', {
//             type: 'offer_received',
//             name: userToReceiveOffer.name,
//             uniqueID: userToReceiveOffer.uniqueID,
//             callerId: data.callerId,
//             data: data.data.sdp,
//             callId: call._id,
//           });
//         }
//         break;

//       case 'create_answer':
//         console.log('new create_answer>>>');
//         let userToReceiveAnswer = findUser(data.uniqueID);
//         console.log('userToReceiveAnswer>>>', userToReceiveAnswer);
//         console.log('data>>>', data);
//         if (userToReceiveAnswer) {
//           console.log('calls complete');
//           const isInCall = ongoingCalls.find(
//             (call) =>
//               call.caller === data.uniqueID || call.receiver === data.uniqueID
//           );
//           if (isInCall) {
//             console.log('while answer ++ ', isInCall);
//             let callerGender = findUser(isInCall.caller);
//             console.log('callerGender ++ ', callerGender);
//             let receiverGender = findUser(isInCall.receiver);
//             console.log('receiverGender ++ ', receiverGender);
//             const caller = await Subscription.findOne({
//               type: 'filter',
//               user_id: isInCall.caller,
//             });
//             if (
//               caller &&
//               caller.planName !== 'both' &&
//               receiverGender.gender !== 'both' &&
//               caller.planName === receiverGender.gender
//             ) {
//               await createSubscription(
//                 isInCall.caller,
//                 isInCall.receiver,
//                 caller.planName
//               );
//             }
//             const receiver = await Subscription.findOne({
//               type: 'filter',
//               user_id: isInCall.receiver,
//             });
//             if (
//               receiver &&
//               receiver.planName !== 'both' &&
//               callerGender.gender !== 'both' &&
//               receiver.planName === callerGender.gender
//             ) {
//               await createSubscription(
//                 isInCall.receiver,
//                 isInCall.caller,
//                 receiver.planName
//               );
//             }
//           }
//           io.to(userToReceiveAnswer.id).emit('message', {
//             type: 'answer_received',
//             name: data.name,
//             data: data.data.sdp,
//           });
//         }
//         break;

//       case 'ice_candidate':
//         console.log('new ice_candidate>>>');
//         console.log('data>>>', data);
//         let userToReceiveIceCandidate = findUser(data.uniqueID);
//         console.log('userToReceiveIceCandidate>>>>>', userToReceiveIceCandidate);
//         if (userToReceiveIceCandidate) {
//           console.log('calls enter');
//           io.to(userToReceiveIceCandidate.id).emit('message', {
//             type: 'ice_candidate',
//             name: data.name,
//             data: {
//               sdpMLineIndex: data.data.sdpMLineIndex,
//               sdpMid: data.data.sdpMid,
//               sdpCandidate: data.data.sdpCandidate,
//             },
//           });
//         }
//         break;

//       case 'end_call':
//         console.log('new end_call>>>');
//         let userToEndCall = findUser(data.uniqueID);
//         if (userToEndCall) {
//           io.to(userToEndCall.id).emit('message', {
//             type: 'call_ended',
//             name: data.name,
//             data: 'call ended',
//           });
//         }
//         const callIndex = ongoingCalls.findIndex(
//           (call) =>
//             (call.caller === data.uniqueID && call.receiver === data.uniqueID) ||
//             (call.receiver === data.uniqueID && call.caller === data.uniqueID)
//         );
//         if (callIndex !== -1) ongoingCalls.splice(callIndex, 1);
//         const nextAvailableUser = await findAvailableUser(data.uniqueID, data.gender);
//         if (!nextAvailableUser) {
//           socket.emit('message', {
//             type: 'call_connected',
//             data: 'No available user for the next call',
//           });
//         } else {
//           ongoingCalls.push({
//             caller: data.uniqueID,
//             receiver: nextAvailableUser.uniqueID,
//           });
//           socket.emit('message', {
//             type: 'call_connected',
//             data: nextAvailableUser.uniqueID,
//             name: nextAvailableUser.name,
//             gender: nextAvailableUser.gender,
//           });
//         }
//         break;
//     }
//   });

//   socket.on('disconnect', () => {
//     const userIndex = users.findIndex((user) => user.id === socket.id);
//     let disconnectedUser = null;
//     if (userIndex !== -1) {
//       disconnectedUser = users.splice(userIndex, 1)[0];
//     }
//     ongoingCalls = ongoingCalls.filter(
//       (call) =>
//         call.caller !== disconnectedUser?.uniqueID &&
//         call.receiver !== disconnectedUser?.uniqueID
//     );
//     console.log(
//       `Cleaned up: Removed user ${
//         disconnectedUser?.name || 'unknown'
//       } from users and ongoing calls.`
//     );
//     console.log('connection closed:', socket.id);
//   });
// });

// // Start server
// server.listen(process.env.PORT || 3000, () => {
//   console.log(`Server listening on port ${process.env.PORT || 3000}`);
// });
