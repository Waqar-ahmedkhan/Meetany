import http from "http";
import { Server as socketIO } from "socket.io";
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { Block } from "./models/Block.js";
import { User } from "./models/User.js";
import { Subscription } from "./models/Subscription.js";
import { CallHistory } from "./models/CallHistory.js";
import multer from "multer";
import crypto from "crypto";
import connectDB from "./config/Database.js";
import userRoute from "./routes/userRoutes.js";
import subscriptionRoute from "./routes/subscriptionRoutes.js";
import interactionRoute from "./routes/interactionRoutes.js";

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // Destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Unique file name
  },
});

const upload = multer({ storage: storage });

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api", userRoute);
app.use("/api", subscriptionRoute);
app.use("/api", interactionRoute);

app.use("/images", express.static("uploads"));
app.get("/images/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const imageUrl = `/images/${fileName}`;
  // console.log("===============>>>>>>>>>>>>",imageUrl)
  res.redirect(imageUrl);
});

connectDB();

// Create HTTP server
const server = http.createServer(app);

server.listen(3000, () => {
  console.log("server listening on port 3000");
});

async function getUserCurrentStars(userId) {
  try {
    // Convert userId to ObjectId if it's not already
    if (typeof userId === "string") {
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

      // Check if this user already has a referral subscription
      const preSubscribe = await Subscription.findOne({
        type: "referral",
        referral_user_id: userRecord._id,
        stars: 10,
      });

      if (!preSubscribe) {
        // Important: Added await here
        const referredBy = await User.findOne({
          refferal_code: userRecord.refferal_code,
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
    // Generate a random alphanumeric code (6 characters)
    userCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    // Check if the generated code already exists
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
  return !!block; // Returns true if a block exists, otherwise false
};

const createSubscription = async (userId, referralUserId, planName) => {
  /*
	await Subscription.create({
        type: "filtercall",
        cost: 0,
        stars: 10,
        taken_date: new Date(),
        user_id: userId,
        referral_user_id: referralUserId,
        planName,
    });
	*/

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
  console.log("currentUserId +++", currentUserId);
  if (currentUserId == "") {
    return null;
  }
  const preSubscribe = await Subscription.findOne({
    type: "filter",
    user_id: currentUserId,
  });

  for (const user of users) {
    if (user.uniqueID === currentUserId) continue;

    // If current user has a preSubscription and planName is not "both", ensure user matches the planName gender
    // if (preSubscribe?.planName !== "both" && user.gender !== "both" && preSubscribe?.planName !== user.gender) continue;

    if (preSubscribe && preSubscribe.planName !== user.gender) continue;

    const userSubscribe = await Subscription.findOne({
      type: "filter",
      user_id: user.uniqueID,
    });

    // Check userSubscribe: If it exists and planName is not "both", ensure currentUser matches the planName gender
    //if (userSubscribe?.planName !== "both" && currentUserGender !== "both" && userSubscribe?.planName !== currentUserGender) continue;
    if (userSubscribe && userSubscribe.planName !== currentUserGender) continue;

    const isInCall = ongoingCalls.some(
      (call) => call.caller === user.uniqueID || call.receiver === user.uniqueID
    );
    if (isInCall) continue;

    const isBlocked = await isUserBlocked(currentUserId, user.uniqueID);
    if (isBlocked) continue;
    /*
        if ((preSubscribe?.planName !== "both" && user.gender !== "both" && preSubscribe?.planName === user.gender) || (preSubscribe?.planName !== "both" && user.gender === "both")) {
            await createSubscription(currentUserId, user.uniqueID, preSubscribe.planName);
        }

        if ((userSubscribe?.planName !== "both" && currentUserGender !== "both" && userSubscribe?.planName === currentUserGender) || (userSubscribe?.planName !== "both" && currentUserGender === "both")) { 
            await createSubscription(user.uniqueID, currentUserId, userSubscribe.planName);
        } */

    return user; // Return the first available user
  }

  return null; // No available user found
};

// Initialize socket.io
const io = new socketIO(server);

const users = [];

let ongoingCalls = [];

// Handle new socket connections
io.on("connection", (socket) => {
  console.log("new connection>>>", socket.id);

  socket.on("message", async (message) => {
    console.log("new message>>>", message);
    const data = JSON.parse(message);
    console.log("parse message>>>", data);
    const user = findUser(data.uniqueID);

    switch (data.type) {
      case "store_user":
        console.log("new store_user>>>");
        if (user != null) {
          // user already exists
          socket.emit("message", {
            type: "user already exists",
          });
          return;
        }

        const newUser = {
          name: data.name,
          id: socket.id, // store the socket id
          uniqueID: data.uniqueID, // store the user id
          gender: data.gender, // store the user gender
        };
        users.push(newUser);

        /* const availableUser = users.find(
          (user) =>
            user.uniqueID !== data.uniqueID &&
            !ongoingCalls.some(
              (call) => call.caller === user.uniqueID || call.receiver === user.uniqueID
            )
        ); */

        const availableUser = await findAvailableUser(
          data.uniqueID,
          data.gender
        );

        console.log("availableUser>>>", availableUser);

        if (availableUser) {
          // Add to ongoing calls
          ongoingCalls.push({
            caller: data.uniqueID,
            receiver: availableUser.uniqueID,
          });

          socket.emit("message", {
            type: "call_connected",
            data: availableUser.uniqueID,
            name: availableUser.name,
            gender: availableUser.gender,
          });
        } else {
          socket.emit("message", {
            type: "call_connected",
            data: "No available user for the call",
            name: "",
            gender: "",
          });
        }

        break;

      case "start_call":
        console.log("new start_call>>>");
        let userToCall = findUser(data.uniqueID);

        if (userToCall) {
          /*
          const callLog = new CallHistory({
            caller: data.callerId,
            receiver: data.targetId,
            status: 'missed'
          });
        const call =  await callLog.save();
        */
          socket.emit("message", {
            type: "call_response",
            data: "user is ready for call",
          });
        } else {
          socket.emit("message", {
            type: "call_response",
            data: "user is not online",
          });
        }
        break;

      case "create_offer":
        console.log("new create_offer>>>");
        let userToReceiveOffer = findUser(data.uniqueID);

        const callLog = new CallHistory({
          caller: data.callerId,
          receiver: data.targetId,
          status: "missed",
        });
        const call = await callLog.save();

        //await manageReferals(data.callerId);
        //await manageReferals(data.targetId);

        console.log("userToReceiveOffer>>>", userToReceiveOffer);

        if (userToReceiveOffer) {
          console.log("enter>>>");
          io.to(userToReceiveOffer.id).emit("message", {
            type: "offer_received", // call cacelled or picked
            //  name: data.name,
            name: userToReceiveOffer.name,
            uniqueID: userToReceiveOffer.uniqueID,
            callerId: data.callerId,
            data: data.data.sdp,
            callId: call._id,
          });
        }
        break;

      case "create_answer":
        console.log("new create_answer>>>");
        let userToReceiveAnswer = findUser(data.uniqueID);
        console.log("userToReceiveAnswer>>>", userToReceiveAnswer);
        console.log("data>>>", data);
        if (userToReceiveAnswer) {
          console.log("calls complete");

          const isInCall = ongoingCalls.find(
            (call) =>
              call.caller === data.uniqueID || call.receiver === data.uniqueID
          );

          if (isInCall) {
            console.log("while answer ++ ", isInCall);

            let callerGender = findUser(isInCall.caller);
            console.log("callerGender ++ ", callerGender);
            let receiverGender = findUser(isInCall.receiver);
            console.log("receiverGender ++ ", receiverGender);

            const caller = await Subscription.findOne({
              type: "filter",
              user_id: isInCall.caller,
            });
            if (
              caller &&
              caller.planName !== "both" &&
              receiverGender.gender !== "both" &&
              caller.planName === receiverGender.gender
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
              callerGender.gender !== "both" &&
              receiver.planName === callerGender.gender
            ) {
              await createSubscription(
                isInCall.receiver,
                isInCall.caller,
                receiver.planName
              );
            }
          }

          io.to(userToReceiveAnswer.id).emit("message", {
            type: "answer_received", // call complete
            name: data.name,
            data: data.data.sdp,
          });
        }
        break;

      case "ice_candidate":
        console.log("new ice_candidate>>>");
        console.log("data>>>", data);
        let userToReceiveIceCandidate = findUser(data.uniqueID);
        console.log(
          "userToReceiveIceCandidate>>>>>",
          userToReceiveIceCandidate
        );
        if (userToReceiveIceCandidate) {
          console.log("calls enter");

          io.to(userToReceiveIceCandidate.id).emit("message", {
            type: "ice_candidate",
            name: data.name,
            data: {
              sdpMLineIndex: data.data.sdpMLineIndex,
              sdpMid: data.data.sdpMid,
              sdpCandidate: data.data.sdpCandidate,
            },
          });
        }
        break;

      // Add the end_call event
      case "end_call":
        console.log("new end_call>>>");
        let userToEndCall = findUser(data.uniqueID);

        if (userToEndCall) {
          io.to(userToEndCall.id).emit("message", {
            type: "call_ended",
            name: data.name,
            data: "call ended",
          });
        }

        // Remove call from ongoingCalls
        const callIndex = ongoingCalls.findIndex(
          (call) =>
            (call.caller === data.uniqueID &&
              call.receiver === data.uniqueID) ||
            (call.receiver === data.uniqueID && call.caller === data.uniqueID)
        );
        if (callIndex !== -1) ongoingCalls.splice(callIndex, 1);

        // Auto-connect to next available user
        /* const nextAvailableUser = users.find(
          (user) =>
            user.uniqueID !== data.uniqueID &&
            !ongoingCalls.some(
              (call) => call.caller === user.uniqueID || call.receiver === user.uniqueID
            )
        ); */

        const nextAvailableUser = await findAvailableUser(
          data.uniqueID,
          data.gender
        );

        if (!nextAvailableUser) {
          socket.emit("message", {
            type: "call_connected",
            data: "No available user for the next call",
          });
        } else {
          // Add the next call to ongoingCalls
          ongoingCalls.push({
            caller: data.uniqueID,
            receiver: nextAvailableUser.uniqueID,
          });

          socket.emit("message", {
            type: "call_connected",
            data: nextAvailableUser.uniqueID,
            name: nextAvailableUser.name,
            gender: nextAvailableUser.gender,
          });
        }

        break;
    }
  });

  socket.on("disconnect", () => {
    // Find and remove the disconnected user from the users array
    const userIndex = users.findIndex((user) => user.id === socket.id);
    let disconnectedUser = null;

    if (userIndex !== -1) {
      disconnectedUser = users.splice(userIndex, 1)[0]; // Remove and store the disconnected user
    }

    // Remove any ongoing calls involving the disconnected user
    ongoingCalls = ongoingCalls.filter(
      (call) =>
        call.caller !== disconnectedUser?.uniqueID &&
        call.receiver !== disconnectedUser?.uniqueID
    );

    console.log(
      `Cleaned up: Removed user ${
        disconnectedUser?.name || "unknown"
      } from users and ongoing calls.`
    );

    /* users.forEach((user) => {
      if (user.id === socket.id) {
        users.splice(users.indexOf(user), 1);
      }
    }); */
    console.log("connection closed:", socket.id);
  });
});

// Function to find a user by name
const findUser = (uniqueID) => {
  for (let i = 0; i < users.length; i++) {
    if (users[i].uniqueID === uniqueID) return users[i];
  }
};
