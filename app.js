// import http from 'http';
// import { Server as socketIO } from 'socket.io';
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

// // Multer configuration for handling file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads'); // Destination folder for uploaded files
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + '-' + file.originalname); // Unique file name
//   },
// });

// const upload = multer({ storage: storage });


// const app = express();
// app.use(express.json());
// app.use(bodyParser.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(bodyParser.urlencoded({ extended: true }));

// app.use("/api", userRoute);
// app.use("/api", subscriptionRoute);
// app.use("/api", interactionRoute);
           

// app.use("/images",express.static("uploads"))
// app.get('/images/:fileName', (req, res) => {
//   const fileName = req.params.fileName;
//   const imageUrl = `/images/${fileName}`;
//   // console.log("===============>>>>>>>>>>>>",imageUrl)
//   res.redirect(imageUrl);
// });





// connectDB();

// // Create HTTP server
// const server = http.createServer((app));

// server.listen(3000, () => {
//   console.log("server listening on port 3000");
// });




// // async function manageReferals(id) {
	 
// // 	const userRecord = await User.findOne({ _id: id });
// // 	if(userRecord && userRecord.refferal_code !== "" && userRecord.refferal_code !== null){
// // 		  console.log("userrecoedTest")
// // 		 const preSubscribe = await Subscription.findOne({ type: "referral",referral_user_id: userRecord._id, stars: 10 });
// // 		 if(!preSubscribe){
			 
// // 			 const referredBy = User.findOne({ refferal_code: userRecord.refferal_code });
// // 			 console.log("RefferalBycheckTest")
// // 			 if(referredBy){
// // 				 const referralSubscription = new Subscription({
// // 				  type: "referral",
// // 				  cost: 0, 
// // 				  stars: 10, 
// // 				  user_id: referredBy._id,
// // 				  referral_user_id: userRecord._id,
// // 				  planName: "refferal user join the app",
// // 				});

// // 				await referralSubscription.save();
// // 			 }
// // 		 }
// // 	}
	
// // 	return 1;
// // }	

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


// async function manageReferrals(id) {
//   try {
//     const userRecord = await User.findOne({ _id: id });
//     if (!userRecord) {
//       console.log("User not found for referral management");
//       return 0;
//     }
    
//     if (userRecord && userRecord.refferal_code && userRecord.refferal_code !== "") {
//       console.log("Processing referral for user:", id, "with code:", userRecord.refferal_code);
      
//       // Check if this user already has a referral subscription
//       const preSubscribe = await Subscription.findOne({ 
//         type: "referral",
//         referral_user_id: userRecord._id, 
//         stars: 10 
//       });
      
//       if (!preSubscribe) {
//         // Important: Added await here
//         const referredBy = await User.findOne({ refferal_code: userRecord.refferal_code });
//         console.log("Referred by user found:", referredBy ? referredBy._id : "Not found");
        
//         if (referredBy) {
//           const referralSubscription = new Subscription({
//             type: "referral",
//             cost: 0, 
//             stars: 10, 
//             user_id: referredBy._id,
//             referral_user_id: userRecord._id,
//             planName: "referral user join the app",
//           });

//           await referralSubscription.save();
//           console.log("Referral bonus saved for:", referredBy._id);
//           return 1;
//         }
//       } else {
//         console.log("User already has referral subscription");
//       }
//     }
    
//     return 0;
//   } catch (error) {
//     console.error("Error in manageReferrals:", error);
//     return -1;
//   }
// }

// async function generateUserCode() {
//   let userCode;
//   let isUnique = false;

//   while (!isUnique) {
//     // Generate a random alphanumeric code (6 characters)
//     userCode = crypto.randomBytes(3).toString('hex').toUpperCase();
//     // Check if the generated code already exists
//     const existingCode = await User.findOne({ user_code: userCode });
//     if (!existingCode) {
//       isUnique = true;
//     }
//   }
//   return userCode;
// }


// // app.post("/api/subscribe", verifyAuthToken, async (req, res) => {
// //     try {
// //         const { planName, cost, stars } = req.body;
		
// // 		if (!planName) {
// // 		  return res.status(403).json({ status: 403, message: 'planName field is required' });
// // 		}
// // 		if (!cost) {
// // 		  return res.status(403).json({ status: 403, message: 'cost field is required' });
// // 		}
// // 		if (!stars) {
// // 		  return res.status(403).json({ status: 403, message: 'stars field is required' });
// // 		}
		
// //         const userId = req.user; 
// //         // Subscription plan details
// //         const plans = {
// //             weekly: {  duration: 7 },
// //             monthly: {  duration: 30 },
// //             quarterly: { duration: 90 },
// //         };

// //         const plan = plans[planName];
// //         if (!plan) return res.status(400).json({ status: 400, error: "Invalid subscription plan" });

// //         const expiryDate = new Date();
// //         expiryDate.setDate(expiryDate.getDate() + plan.duration);
		
// // 		const userRecord = await User.findOne({ _id: userId });
// // 		if(userRecord.refferal_code !== "" && userRecord.refferal_code !== null){
// // 			const preSubscribe = await Subscription.findOne({ type: "subscription",user_id: userId });
// // 			if (preSubscribe) {
// // 			}else{
// // 				const referredBy = User.findOne({ refferal_code: userRecord.refferal_code });
// // 				 const referralSubscription = new Subscription({
// // 				  type: "referral",
// // 				  cost: 0, 
// // 				  stars: 100, 
// // 				  user_id: referredBy._id,
// // 				  referral_user_id: userRecord._id,
// // 				  planName: "refferal user takes a premium plan",
// // 				});

// // 				await referralSubscription.save();
// // 			}
// // 		} 

// //         // Save subscription
// //         const subscription = new Subscription({
// //             type: "subscription",
// //             cost: cost,
// //             stars: stars,
// //             taken_date: new Date(),
// //             expiry_date: expiryDate,
// //             user_id: userId,
// //             planName,
// //         });

// //         await subscription.save();
// //         res.status(201).json({ status: 200, message: "Subscription added successfully", subscription });
// //     } catch (error) {
// //         res.status(500).json({ status: 500, error: error.message });
// //     }
// // });

// const isUserBlocked = async (userId, targetUserId) => {
//   const block = await Block.findOne({
//     $or: [
//       { user_id: userId, blocked_user_id: targetUserId },
//       { user_id: targetUserId, blocked_user_id: userId },
//     ],
//   });
//   return !!block; // Returns true if a block exists, otherwise false
// }; 


// const createSubscription = async (userId, referralUserId, planName) => {
    
// 	/*
// 	await Subscription.create({
//         type: "filtercall",
//         cost: 0,
//         stars: 10,
//         taken_date: new Date(),
//         user_id: userId,
//         referral_user_id: referralUserId,
//         planName,
//     });
// 	*/
	
// 	const subscription = new Subscription({
// 				type: "filtercall",
// 				cost: 0,
// 				stars: 10,
// 				taken_date: new Date(),
// 				user_id: userId,
// 				referral_user_id: referralUserId,
// 				planName,
//    });

//    await subscription.save();
	
// };  

// const findAvailableUser = async (currentUserId, currentUserGender) => { 
//    console.log("currentUserId +++", currentUserId);
//    if(currentUserId == ""){
// 	   return null;
//    }
//     const preSubscribe = await Subscription.findOne({ type: "filter", user_id: currentUserId });

//     for (const user of users) {
//         if (user.uniqueID === currentUserId) continue;
		
// 		// If current user has a preSubscription and planName is not "both", ensure user matches the planName gender
//         // if (preSubscribe?.planName !== "both" && user.gender !== "both" && preSubscribe?.planName !== user.gender) continue;
        
// 		if (preSubscribe && preSubscribe.planName !==  user.gender) continue;
		
// 		const userSubscribe = await Subscription.findOne({ type: "filter", user_id: user.uniqueID });

// 		// Check userSubscribe: If it exists and planName is not "both", ensure currentUser matches the planName gender
//         //if (userSubscribe?.planName !== "both" && currentUserGender !== "both" && userSubscribe?.planName !== currentUserGender) continue;
//         if (userSubscribe && userSubscribe.planName !==  currentUserGender) continue;
		
//         const isInCall = ongoingCalls.some(call => 
//             call.caller === user.uniqueID || call.receiver === user.uniqueID
//         );
//         if (isInCall) continue;

//         const isBlocked = await isUserBlocked(currentUserId, user.uniqueID);
//         if (isBlocked) continue;
//         /*
//         if ((preSubscribe?.planName !== "both" && user.gender !== "both" && preSubscribe?.planName === user.gender) || (preSubscribe?.planName !== "both" && user.gender === "both")) {
//             await createSubscription(currentUserId, user.uniqueID, preSubscribe.planName);
//         }

//         if ((userSubscribe?.planName !== "both" && currentUserGender !== "both" && userSubscribe?.planName === currentUserGender) || (userSubscribe?.planName !== "both" && currentUserGender === "both")) { 
//             await createSubscription(user.uniqueID, currentUserId, userSubscribe.planName);
//         } */

//         return user; // Return the first available user
//     }

//     return null; // No available user found
// };

// /*
// const findAvailableUser = async (currentUserId,currentUsergender) => {
  
//   const preSubscribe = await Subscription.findOne({ type: "filter",user_id: currentUserId });  
//   for (let i = 0; i < users.length; i++) {
//     const user = users[i];

//     // Check if the user is not the same as the current user
//     if (user.uniqueID !== currentUserId) {
//       // Check if the user is already in an ongoing call
//       const isInCall = ongoingCalls.some(
//         (call) =>
//           call.caller === user.uniqueID || call.receiver === user.uniqueID
//       );

//       // Check if the user is blocked or has blocked the current user
//       const isBlocked = await isUserBlocked(currentUserId, user.uniqueID);
// 	  const userSubscribe = await Subscription.findOne({ type: "filter",user_id: user.uniqueID }); 
	  
// 	  if (!isInCall && !isBlocked) { 
// 		if(preSubscribe && preSubscribe.planName != "both" && preSubscribe.planName == user.gender){
			
// 			 const subscription = new Subscription({
// 				type: "filtercall",
// 				cost: 0, 
// 				stars: 10,
// 				taken_date: new Date(),
// 				user_id: currentUserId,
// 				referral_user_id: user.uniqueID,
// 				planName: preSubscribe.planName,
// 		     });

// 		     await subscription.save();
			
// 		}  
// 		if(userSubscribe && userSubscribe.planName != "both" && userSubscribe.planName == currentUsergender){ 
			
// 			const subscriptiondata = new Subscription({
// 				type: "filtercall",
// 				cost: 0, 
// 				stars: 10,
// 				taken_date: new Date(),
// 				user_id: user.uniqueID,
// 				referral_user_id: currentUserId,
// 				planName: userSubscribe.planName,
// 		     });

// 		     await subscriptiondata.save(); 
			
// 		}
//         return user; // Return the first available user who meets all conditions
//       }
//     }
//   }

//   return null; // No available user found
// };

// */


// // Initialize socket.io
// const io = new socketIO(server);

// const users = [];

// let ongoingCalls = [];

// // Handle new socket connections
// io.on("connection", (socket) => {
//   console.log("new connection>>>", socket.id);

//   socket.on("message", async (message) => {
//     console.log("new message>>>", message);
//     const data = JSON.parse(message);
//     console.log("parse message>>>", data);
//     const user = findUser(data.uniqueID);

//     switch (data.type) {
//       case "store_user":
//         console.log("new store_user>>>");
//         if (user != null) {
//           // user already exists
//           socket.emit("message", {
//             type: "user already exists",
//           });
//           return;
//         }

//         const newUser = {
//           name: data.name,
//           id: socket.id, // store the socket id
//           uniqueID: data.uniqueID, // store the user id
//           gender: data.gender, // store the user gender
//         };
//         users.push(newUser);
		
// 		/* const availableUser = users.find(
//           (user) =>
//             user.uniqueID !== data.uniqueID &&
//             !ongoingCalls.some(
//               (call) => call.caller === user.uniqueID || call.receiver === user.uniqueID
//             )
//         ); */
		
// 		const availableUser = await findAvailableUser(data.uniqueID,data.gender);
		
// 		console.log("availableUser>>>",availableUser);
		
// 		 if (availableUser) {
         
// 		 // Add to ongoing calls
//           ongoingCalls.push({
//             caller: data.uniqueID,
//             receiver: availableUser.uniqueID,
//           });
		  
// 		  socket.emit("message", {
//             type: "call_connected",
//             data: availableUser.uniqueID,
// 			name: availableUser.name,
// 			gender: availableUser.gender,
//           });
		  

//         } else {
//           socket.emit("message", {
//             type: "call_connected",
//             data: "No available user for the call",
// 			name:'',
// 			gender:''
//           });
//         }
		
		
//         break;

//       case "start_call":
//         console.log("new start_call>>>");
//         let userToCall = findUser(data.uniqueID);

//         if (userToCall) {
//          /*
//           const callLog = new CallHistory({
//             caller: data.callerId,
//             receiver: data.targetId,
//             status: 'missed'
//           });
//         const call =  await callLog.save();
//         */
//           socket.emit("message", {
//             type: "call_response",
//             data: "user is ready for call"
//           });

//         } else {
//           socket.emit("message", {
//             type: "call_response",
//             data: "user is not online",
//           });
//         }
//         break;


//       case "create_offer":
//         console.log("new create_offer>>>");
//         let userToReceiveOffer = findUser(data.uniqueID);
		
// 		const callLog = new CallHistory({
//             caller: data.callerId,
//             receiver: data.targetId,
//             status: 'missed'
//           });
//         const call =  await callLog.save();
		
// 		//await manageReferals(data.callerId);
// 		//await manageReferals(data.targetId);

        
// 		console.log("userToReceiveOffer>>>",userToReceiveOffer);
		
//         if (userToReceiveOffer) { 
// 			console.log("enter>>>");
//           io.to(userToReceiveOffer.id).emit("message", {
//             type: "offer_received", // call cacelled or picked
//           //  name: data.name,
//             name: userToReceiveOffer.name,
// 			uniqueID: userToReceiveOffer.uniqueID, 
// 			callerId: data.callerId,
//             data: data.data.sdp,
// 			callId: call._id
//           });
//         }
//         break;

//       case "create_answer":
//         console.log("new create_answer>>>");
//         let userToReceiveAnswer = findUser(data.uniqueID);
// 		console.log("userToReceiveAnswer>>>",userToReceiveAnswer);
// 		console.log("data>>>",data);
//         if (userToReceiveAnswer) {
			
// 			console.log("calls complete");
			
// 			const isInCall = ongoingCalls.find(call => 
// 				call.caller === data.uniqueID || call.receiver === data.uniqueID
// 			);
			
// 		 if (isInCall) {
// 			 console.log("while answer ++ ",isInCall);
			 
// 			 let callerGender = findUser(isInCall.caller);
// 			 console.log("callerGender ++ ",callerGender);
// 			 let receiverGender = findUser(isInCall.receiver);
// 			 console.log("receiverGender ++ ",receiverGender);
			 
// 			 const caller = await Subscription.findOne({ type: "filter", user_id: isInCall.caller });
// 			 if (caller && caller.planName !== "both" && receiverGender.gender !== "both" && caller.planName === receiverGender.gender) {
// 				await createSubscription(isInCall.caller, isInCall.receiver, caller.planName);
// 			 }
// 			 const receiver = await Subscription.findOne({ type: "filter", user_id: isInCall.receiver });
// 			 if (receiver && receiver.planName !== "both" && callerGender.gender !== "both" && receiver.planName === callerGender.gender) {
// 				await createSubscription(isInCall.receiver, isInCall.caller, receiver.planName);
// 			 }
				
// 		 }
			
			
//           io.to(userToReceiveAnswer.id).emit("message", {
//             type: "answer_received", // call complete
//             name: data.name,
//             data: data.data.sdp,
//           });
//         }
//         break;

//       case "ice_candidate":
//         console.log("new ice_candidate>>>");
// 		console.log("data>>>",data);
//         let userToReceiveIceCandidate = findUser(data.uniqueID);
// 		console.log("userToReceiveIceCandidate>>>>>",userToReceiveIceCandidate);
//         if (userToReceiveIceCandidate) {
// 			console.log("calls enter"); 
			
// 		 io.to(userToReceiveIceCandidate.id).emit("message", {
//             type: "ice_candidate",
//             name: data.name,
//             data: {
//               sdpMLineIndex: data.data.sdpMLineIndex,
//               sdpMid: data.data.sdpMid,
//               sdpCandidate: data.data.sdpCandidate,
//             },
//           });
//         }
//         break;

//       // Add the end_call event
//       case "end_call":
//         console.log("new end_call>>>");
//         let userToEndCall = findUser(data.uniqueID);

//         if (userToEndCall) {
//           io.to(userToEndCall.id).emit("message", {
//             type: "call_ended",
//             name: data.name,
//             data: "call ended",
//           });
//         }
		
		
// 		// Remove call from ongoingCalls
//         const callIndex = ongoingCalls.findIndex(
//           (call) =>
//             (call.caller === data.uniqueID && call.receiver === data.uniqueID) ||
//             (call.receiver === data.uniqueID && call.caller === data.uniqueID)
//         );
//         if (callIndex !== -1) ongoingCalls.splice(callIndex, 1);
		
		
// 		// Auto-connect to next available user
//        /* const nextAvailableUser = users.find(
//           (user) =>
//             user.uniqueID !== data.uniqueID &&
//             !ongoingCalls.some(
//               (call) => call.caller === user.uniqueID || call.receiver === user.uniqueID
//             )
//         ); */
		
// 		const nextAvailableUser = await findAvailableUser(data.uniqueID,data.gender);

//         if (!nextAvailableUser) {
//           socket.emit("message", {
//             type: "call_connected",
//             data: "No available user for the next call",
//           });
//         } else {
//           // Add the next call to ongoingCalls
//           ongoingCalls.push({
//             caller: data.uniqueID,
//             receiver: nextAvailableUser.uniqueID,
//           });
		  
// 		  socket.emit("message", {
//             type: "call_connected",
//             data: nextAvailableUser.uniqueID,
// 			name: nextAvailableUser.name,
// 			gender: nextAvailableUser.gender 
//           });
		  
// 		}	  
		
		
		
//         break;
//     }
//   });

//   socket.on("disconnect", () => {
	  
// 	// Find and remove the disconnected user from the users array
// 	  const userIndex = users.findIndex((user) => user.id === socket.id);
// 	  let disconnectedUser = null;

// 	  if (userIndex !== -1) {
// 		disconnectedUser = users.splice(userIndex, 1)[0]; // Remove and store the disconnected user
// 	  }

// 	  // Remove any ongoing calls involving the disconnected user
// 	  ongoingCalls = ongoingCalls.filter(
// 		(call) =>
// 		  call.caller !== disconnectedUser?.uniqueID &&
// 		  call.receiver !== disconnectedUser?.uniqueID
// 	  );

// 	  console.log(
// 		`Cleaned up: Removed user ${
// 		  disconnectedUser?.name || "unknown"
// 		} from users and ongoing calls.`
// 	  );  
	  
//     /* users.forEach((user) => {
//       if (user.id === socket.id) {
//         users.splice(users.indexOf(user), 1);
//       }
//     }); */
//     console.log("connection closed:", socket.id);
//   });
  
// });

// // Function to find a user by name
// const findUser = (uniqueID) => {
//   for (let i = 0; i < users.length; i++) {
//     if (users[i].uniqueID === uniqueID) return users[i];
//   }
// };

import http from 'http';
import { Server as socketIO } from 'socket.io';
import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import { Block } from './models/Block.js'; // Assuming these models exist in your project
import { User } from './models/User.js';
import { Subscription } from './models/Subscription.js';
import { CallHistory } from './models/CallHistory.js';
import multer from 'multer';
import crypto from 'crypto';
import connectDB from './config/Database.js'; // Assuming your database connection setup
import userRoute from './routes/userRoutes.js'; // Assuming your API routes
import subscriptionRoute from './routes/subscriptionRoutes.js';
import interactionRoute from './routes/interactionRoutes.js';

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); // Destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique file name
  },
});

const upload = multer({ storage: storage });


const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Use your defined routes
app.use("/api", userRoute);
app.use("/api", subscriptionRoute);
app.use("/api", interactionRoute);


// Serve uploaded images statically
app.use("/images",express.static("uploads"))
app.get('/images/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const imageUrl = `/images/${fileName}`;
  res.redirect(imageUrl); // Redirect to the static file URL
});


// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer((app));

const PORT = process.env.PORT || 3000; // Use environment variable or default port
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


// Helper functions (kept from your original code)
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


async function manageReferrals(id) {
  try {
    const userRecord = await User.findOne({ _id: id });
    if (!userRecord) {
      console.log("User not found for referral management");
      return 0;
    }

    if (userRecord && userRecord.refferal_code && userRecord.refferal_code !== "") {
      console.log("Processing referral for user:", id, "with code:", userRecord.refferal_code);

      // Check if this user already has a referral subscription
      const preSubscribe = await Subscription.findOne({
        type: "referral",
        referral_user_id: userRecord._id,
        stars: 10
      });

      if (!preSubscribe) {
        const referredBy = await User.findOne({ refferal_code: userRecord.refferal_code });
        console.log("Referred by user found:", referredBy ? referredBy._id : "Not found");

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
    userCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    // Check if the generated code already exists
    const existingCode = await User.findOne({ user_code: userCode });
    if (!existingCode) {
      isUnique = true;
    }
  }
  return userCode;
}

const isUserBlocked = async (userId, targetUserId) => {
  // Ensure valid ObjectId conversion
  try {
    userId = new mongoose.Types.ObjectId(userId);
    targetUserId = new mongoose.Types.ObjectId(targetUserId);
  } catch (error) {
    console.error("Invalid ObjectId for blocking check:", error);
    return true; // Treat as blocked on invalid ID
  }

  const block = await Block.findOne({
    $or: [
      { user_id: userId, blocked_user_id: targetUserId },
      { user_id: targetUserId, blocked_user_id: userId },
    ],
  });
  return !!block; // Returns true if a block exists, otherwise false
};


const createSubscription = async (userId, referralUserId, planName) => {
  try {
     // Ensure valid ObjectId conversion
    if (typeof userId === 'string') {
      userId = new mongoose.Types.ObjectId(userId);
    }
    if (typeof referralUserId === 'string') {
      referralUserId = new mongoose.Types.ObjectId(referralUserId);
    }

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
    console.log(`Created filtercall subscription for user ${userId} with referral ${referralUserId}`);
  } catch (error) {
    console.error("Error creating filtercall subscription:", error);
  }
};


// Using a Map for connected users for efficient lookups
const connectedUsers = new Map(); // uniqueID -> { id: socket.id, name: ..., uniqueID: ..., gender: ... }
let ongoingCalls = []; // { caller: uniqueID, receiver: uniqueID, callId: Mongoose ObjectId }


const findAvailableUser = async (currentUserId, currentUserGender) => {
  console.log(`[${new Date().toISOString()}] Attempting to find available user for ${currentUserId} (${currentUserGender})`);
  if (!currentUserId || typeof currentUserId !== 'string') {
    console.log("Invalid currentUserId provided to findAvailableUser.");
    return null;
  }

  const start = Date.now();
  const timeoutDuration = 15000; // Increased timeout for finding a user

  // Create a promise that rejects if the timeout is reached
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout finding user for ${currentUserId}`)), timeoutDuration)
  );

  try {
    const potentialPartnerIds = Array.from(connectedUsers.keys()).filter(id => id !== currentUserId);

    if (potentialPartnerIds.length === 0) {
        console.log(`[${new Date().toISOString()}] No other users connected for ${currentUserId}.`);
        return null;
    }

    // Batch queries
    const [currentUserSubscription, potentialPartnerSubscriptions, blockEntries] = await Promise.race([
        Promise.all([
          Subscription.findOne({ type: "filter", user_id: currentUserId }).lean(),
          Subscription.find({ type: "filter", user_id: { $in: potentialPartnerIds } }).lean(),
          Block.find({
            $or: [
              { user_id: currentUserId, blocked_user_id: { $in: potentialPartnerIds } },
              { user_id: { $in: potentialPartnerIds }, blocked_user_id: currentUserId },
            ],
          }).lean(),
        ]),
        timeoutPromise // Race with the timeout promise
    ]);


    console.log(`[${new Date().toISOString()}] DB queries for ${currentUserId} took ${Date.now() - start}ms.`);

    const blockedUserIds = new Set(blockEntries.map(b => b.user_id.toString() === currentUserId ? b.blocked_user_id.toString() : b.user_id.toString()));
    const partnerSubMap = new Map(potentialPartnerSubscriptions.map(s => [s.user_id.toString(), s]));

    for (const [uniqueID, user] of connectedUsers.entries()) {
      if (uniqueID === currentUserId) continue; // Skip current user
      if (blockedUserIds.has(uniqueID)) {
          console.log(`[${new Date().toISOString()}] Skipping blocked user ${uniqueID} for ${currentUserId}.`);
          continue; // Skip if blocked
      }
      if (ongoingCalls.some(call => call.caller === uniqueID || call.receiver === uniqueID)) {
           console.log(`[${new Date().toISOString()}] Skipping user ${uniqueID} as they are in an ongoing call for ${currentUserId}.`);
           continue; // Skip if in a call
      }

      const partnerSubscription = partnerSubMap.get(uniqueID);

      // Check current user's filter against partner's gender
      // If current user has a filter (not 'both') and partner's gender is not 'both', they must match.
      if (currentUserSubscription && currentUserSubscription.planName !== 'both' && user.gender !== 'both' && currentUserSubscription.planName !== user.gender) {
          console.log(`[${new Date().toISOString()}] Skipping user ${uniqueID} due to current user's gender filter for ${currentUserId}.`);
          continue;
      }

       // Check partner's filter against current user's gender
       // If partner has a filter (not 'both') and current user's gender is not 'both', they must match.
      if (partnerSubscription && partnerSubscription.planName !== 'both' && currentUserGender !== 'both' && partnerSubscription.planName !== currentUserGender) {
          console.log(`[${new Date().toISOString()}] Skipping user ${uniqueID} due to partner's gender filter for ${currentUserId}.`);
          continue;
      }

      // If we reach here, the user is available
      console.log(`[${new Date().toISOString()}] Found available user: ${user.uniqueID} for ${currentUserId}.`);
      return user;
    }

    console.log(`[${new Date().toISOString()}] No available user found for ${currentUserId}.`);
    return null; // No available user found

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in findAvailableUser for ${currentUserId}:`, error);
     if (error.message.includes('Timeout')) {
        console.warn(`[${new Date().toISOString()}] findAvailableUser timed out for ${currentUserId}.`);
     }
    return null;
  }
};


// Initialize socket.io
const io = new socketIO(server);

// Handle new socket connections
io.on("connection", (socket) => {
  console.log(`[${new Date().toISOString()}] New connection: ${socket.id}`);

  socket.on("message", async (message) => {
    console.log(`[${new Date().toISOString()}] Received message from ${socket.id}: ${message}`);
    let data;
    try {
      data = JSON.parse(message);
      if (!data.type) {
         throw new Error("Message type is missing");
      }
      // Basic validation for uniqueID in most messages
       if (data.type !== 'store_user' && !data.uniqueID) {
           throw new Error(`uniqueID is missing for message type ${data.type}`);
       }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Invalid message format from ${socket.id}:`, error);
      socket.emit("error", { message: "Invalid message format" });
      return;
    }

    // Find the user based on uniqueID for subsequent message types
     const user = data.uniqueID ? connectedUsers.get(data.uniqueID) : null;


    switch (data.type) {
      case "store_user":
        console.log(`[${new Date().toISOString()}] Handling store_user for ${socket.id} with uniqueID ${data.uniqueID}`);
        if (!data.uniqueID || !data.name || !data.gender) {
             socket.emit("error", { message: "Missing uniqueID, name, or gender for store_user" });
             return;
        }

        if (user) {
          console.log(`[${new Date().toISOString()}] User ${data.uniqueID} already exists, updating socket ID.`);
          user.id = socket.id; // Update socket ID if user reconnects
           connectedUsers.set(data.uniqueID, user);
           socket.emit("message", {
             type: "user_already_exists",
             data: "User already connected, socket ID updated.",
           });
        } else {
          console.log(`[${new Date().toISOString()}] Storing new user: ${data.uniqueID}`);
          const newUser = {
            name: data.name,
            id: socket.id, // store the socket id
            uniqueID: data.uniqueID, // store the user id
            gender: data.gender, // store the user gender
          };
          connectedUsers.set(data.uniqueID, newUser);
           socket.emit("message", { type: "status", data: "User stored, searching for a partner..." });

          const availableUser = await findAvailableUser(data.uniqueID, data.gender);

          if (availableUser) {
            console.log(`[${new Date().toISOString()}] Found available user ${availableUser.uniqueID} for ${data.uniqueID}. Initiating call.`);
            const callId = new mongoose.Types.ObjectId().toString();
            ongoingCalls.push({
              caller: data.uniqueID,
              receiver: availableUser.uniqueID,
              callId: callId,
              startTime: new Date()
            });

            // Notify the initiating user
            socket.emit("message", {
              type: "call_connected",
              data: availableUser.uniqueID,
              name: availableUser.name,
              gender: availableUser.gender,
              callId: callId,
            });

            // Notify the available user
             io.to(availableUser.id).emit("message", {
                type: "call_incoming",
                data: newUser.uniqueID,
                name: newUser.name,
                gender: newUser.gender,
                callId: callId, // Send the callId with the incoming call
             });

          } else {
            console.log(`[${new Date().toISOString()}] No available user found for ${data.uniqueID}.`);
            socket.emit("message", {
              type: "call_connected", // Or a more appropriate type like "no_user_found"
              data: "No available user for the call",
              name: '',
              gender: '',
              callId: null // No callId if no user is found
            });
          }
        }
        break;

      case "start_call":
         console.log(`[${new Date().toISOString()}] Handling start_call from ${socket.id}. This message type might be redundant or require specific target logic.`);
         // This case might be redundant if "store_user" already handles finding a partner and initiating a call.
         // If it's intended for direct calling a specific user, additional logic and data (like target uniqueID) are needed.
         // For now, based on the current flow, this seems less critical or potentially misused.
         // If you intend direct calls, you'll need to implement logic here to find the target user and initiate the offer/answer flow.
        break;


      case "create_offer":
        console.log(`[${new Date().toISOString()}] Handling create_offer from ${socket.id} (caller ${data.callerId}) to target ${data.uniqueID} for call ID ${data.callId}`);
        if (!data.data?.sdp || !data.callerId || !data.uniqueID || !data.callId) {
            socket.emit("error", { message: "Invalid offer data (missing sdp, callerId, target uniqueID, or callId)" });
            return;
        }

        const userToReceiveOffer = connectedUsers.get(data.uniqueID); // This is the target user's uniqueID

        if (userToReceiveOffer) {
           console.log(`[${new Date().toISOString()}] User to receive offer found: ${userToReceiveOffer.uniqueID}. Checking for block.`);
           const isBlocked = await isUserBlocked(data.callerId, data.uniqueID);
           if (isBlocked) {
               console.log(`[${new Date().toISOString()}] Call blocked between ${data.callerId} and ${data.uniqueID}.`);
               socket.emit("message", { type: "call_blocked", data: "User is blocked" });
               // Potentially find next user for the caller if the call is blocked
                const callerUser = connectedUsers.get(data.callerId);
                if(callerUser) {
                     // Remove the blocked call entry if it exists
                      ongoingCalls = ongoingCalls.filter(call => call.callId !== data.callId);

                     const nextAvailableUser = await findAvailableUser(callerUser.uniqueID, callerUser.gender);
                      if (nextAvailableUser) {
                         console.log(`[${new Date().toISOString()}] Blocked call: Found next available user ${nextAvailableUser.uniqueID} for ${callerUser.uniqueID}.`);
                         const newCallId = new mongoose.Types.ObjectId().toString();
                         ongoingCalls.push({
                            caller: callerUser.uniqueID,
                            receiver: nextAvailableUser.uniqueID,
                            callId: newCallId,
                            startTime: new Date()
                         });
                         socket.emit("message", {
                            type: "call_connected",
                            data: nextAvailableUser.uniqueID,
                            name: nextAvailableUser.name,
                            gender: nextAvailableUser.gender,
                            callId: newCallId // Pass the new callId
                         });
                         io.to(nextAvailableUser.id).emit("message", {
                             type: "call_incoming",
                             data: callerUser.uniqueID,
                             name: callerUser.name,
                             gender: callerUser.gender,
                              callId: newCallId // Pass the new callId
                         });
                      } else {
                          console.log(`[${new Date().toISOString()}] Blocked call: No next available user found for ${callerUser.uniqueID}.`);
                           socket.emit("message", {
                             type: "call_connected", // Or "no_user_found"
                             data: "No available user for the call",
                             name: '',
                             gender: '',
                             callId: null
                           });
                      }
                }
               return;
           }

           // Find the ongoing call entry to ensure the offer is for an active call
            const callEntry = ongoingCalls.find(c => c.callId === data.callId && c.caller === data.callerId && c.receiver === data.uniqueID);

           if (!callEntry) {
                console.warn(`[${new Date().toISOString()}] Received offer for unknown or stale call ID: ${data.callId}. Ignoring offer.`);
                 // Potentially find next user for the caller if the call is stale
                const callerUser = connectedUsers.get(data.callerId);
                if(callerUser) {
                     const nextAvailableUser = await findAvailableUser(callerUser.uniqueID, callerUser.gender);
                      if (nextAvailableUser) {
                         console.log(`[${new Date().toISOString()}] Stale offer: Found next available user ${nextAvailableUser.uniqueID} for ${callerUser.uniqueID}.`);
                         const newCallId = new mongoose.Types.ObjectId().toString();
                         ongoingCalls.push({
                            caller: callerUser.uniqueID,
                            receiver: nextAvailableUser.uniqueID,
                            callId: newCallId,
                            startTime: new Date()
                         });
                         socket.emit("message", {
                            type: "call_connected",
                            data: nextAvailableUser.uniqueID,
                            name: nextAvailableUser.name,
                            gender: nextAvailableUser.gender,
                            callId: newCallId // Pass the new callId
                         });
                         io.to(nextAvailableUser.id).emit("message", {
                            type: "call_incoming",
                            data: callerUser.uniqueID,
                            name: callerUser.name,
                            gender: callerUser.gender,
                            callId: newCallId // Pass the new callId
                         });
                      } else {
                           console.log(`[${new Date().toISOString()}] Stale offer: No next available user found for ${callerUser.uniqueID}.`);
                            socket.emit("message", {
                              type: "call_connected", // Or "no_user_found"
                              data: "No available user for the call",
                              name: '',
                              gender: '',
                              callId: null
                            });
                      }
                }
                return; // Stop processing if call entry not found
           }


            // Create or update a CallHistory entry when the offer is created
            try {
                 let callLog = await CallHistory.findOne({ _id: data.callId });
                 if (!callLog) {
                      callLog = new CallHistory({
                         _id: data.callId, // Use the provided callId
                         caller: data.callerId,
                         receiver: data.uniqueID, // The receiver of the offer
                         status: 'pending', // Initial status when offer is created
                         startedAt: new Date()
                      });
                       await callLog.save();
                       console.log(`[${new Date().toISOString()}] Created CallHistory entry for call ID: ${data.callId}`);
                 } else if (callLog.status === 'missed') {
                      // If the call was previously missed, update its status to pending as a new offer is being sent
                      callLog.status = 'pending';
                      callLog.startedAt = new Date(); // Update start time
                      await callLog.save();
                       console.log(`[${new Date().toISOString()}] Updated CallHistory status to pending for call ID: ${data.callId} (was missed).`);
                 }
            } catch (historyError) {
                 console.error(`[${new Date().toISOString()}] Error creating/updating CallHistory for offer ${data.callId}:`, historyError);
            }


          io.to(userToReceiveOffer.id).emit("message", {
            type: "offer_received",
            name: connectedUsers.get(data.callerId)?.name || "Unknown User", // Send caller's name
            uniqueID: data.callerId, // Send caller's uniqueID
            callerId: data.callerId, // Redundant but kept for clarity
            data: data.data.sdp,
            callId: data.callId // Pass the callId
          });
           console.log(`[${new Date().toISOString()}] Offer sent to ${userToReceiveOffer.uniqueID} (socket ${userToReceiveOffer.id}) for call ID: ${data.callId}`);
        } else {
           console.warn(`[${new Date().toISOString()}] User to receive offer not found for uniqueID: ${data.uniqueID}.`);
             socket.emit("message", {
                 type: "user_not_online",
                 data: "The user you are trying to call is not online."
             });
             // Potentially find next user for the caller if the target is offline
                const callerUser = connectedUsers.get(data.callerId);
                if(callerUser) {
                     // Remove the call entry for the offline user
                      ongoingCalls = ongoingCalls.filter(call => call.callId !== data.callId);

                     const nextAvailableUser = await findAvailableUser(callerUser.uniqueID, callerUser.gender);
                      if (nextAvailableUser) {
                         console.log(`[${new Date().toISOString()}] Offline target: Found next available user ${nextAvailableUser.uniqueID} for ${callerUser.uniqueID}.`);
                         const newCallId = new mongoose.Types.ObjectId().toString();
                         ongoingCalls.push({
                            caller: callerUser.uniqueID,
                            receiver: nextAvailableUser.uniqueID,
                            callId: newCallId,
                            startTime: new Date()
                         });
                         socket.emit("message", {
                            type: "call_connected",
                            data: nextAvailableUser.uniqueID,
                            name: nextAvailableUser.name,
                            gender: nextAvailableUser.gender,
                             callId: newCallId // Pass the new callId
                         });
                          io.to(nextAvailableUser.id).emit("message", {
                            type: "call_incoming",
                            data: callerUser.uniqueID,
                            name: callerUser.name,
                            gender: callerUser.gender,
                            callId: newCallId // Pass the new callId
                         });
                      } else {
                           console.log(`[${new Date().toISOString()}] Offline target: No next available user found for ${callerUser.uniqueID}.`);
                            socket.emit("message", {
                              type: "call_connected", // Or "no_user_found"
                              data: "No available user for the call",
                              name: '',
                              gender: '',
                              callId: null
                            });
                      }
                }
        }
        break;

      case "create_answer":
        console.log(`[${new Date().toISOString()}] Handling create_answer from ${socket.id} (receiver ${data.uniqueID}) to caller ${data.callerId} for call ID ${data.callId}`);
         if (!data.data?.sdp || !data.callerId || !data.uniqueID || !data.callId) {
            socket.emit("error", { message: "Invalid answer data (missing sdp, callerId, uniqueID, or callId)" });
            return;
        }

        const userToReceiveAnswer = connectedUsers.get(data.uniqueID); // This should be the receiver
        const callerUser = connectedUsers.get(data.callerId); // This should be the caller

        if (userToReceiveAnswer && callerUser) {
          console.log(`[${new Date().toISOString()}] User to receive answer found: ${userToReceiveAnswer.uniqueID}. Caller user found: ${callerUser.uniqueID}`);

           // Find the ongoing call entry to ensure the answer is for an active call
            const callEntry = ongoingCalls.find(c => c.callId === data.callId && c.caller === data.callerId && c.receiver === data.uniqueID);

           if (!callEntry) {
                console.warn(`[${new Date().toISOString()}] Received answer for unknown or stale call ID: ${data.callId}. Ignoring answer.`);
                return; // Ignore stale answer
           }

          // Update CallHistory status to 'answered'
           try {
                await CallHistory.updateOne(
                     { _id: data.callId, status: "pending" }, // Only update if still pending
                     { status: "answered", answeredAt: new Date() }
                 );
                console.log(`[${new Date().toISOString()}] Updated CallHistory status to answered for call ID: ${data.callId}`);
           } catch (historyError) {
               console.error(`[${new Date().toISOString()}] Error updating CallHistory for answered call ${data.callId}:`, historyError);
           }


          // Check and create filtercall subscriptions if applicable
          try {
            const callerSubscription = await Subscription.findOne({ type: "filter", user_id: data.callerId }).lean();
            const receiverSubscription = await Subscription.findOne({ type: "filter", user_id: data.uniqueID }).lean();

            // If caller has a filter and receiver's gender matches the filter (and neither is 'both')
            if (callerSubscription && callerSubscription.planName !== "both" && userToReceiveAnswer.gender !== "both" && callerSubscription.planName === userToReceiveAnswer.gender) {
              await createSubscription(data.callerId, data.uniqueID, callerSubscription.planName);
            } else {
                 console.log(`[${new Date().toISOString()}] No filtercall sub created for caller ${data.callerId}. Caller sub: ${!!callerSubscription}, Plan: ${callerSubscription?.planName}, Receiver Gender: ${userToReceiveAnswer.gender}`);
            }

             // If receiver has a filter and caller's gender matches the filter (and neither is 'both')
            if (receiverSubscription && receiverSubscription.planName !== "both" && callerUser.gender !== "both" && receiverSubscription.planName === callerUser.gender) {
              await createSubscription(data.uniqueID, data.callerId, receiverSubscription.planName);
            } else {
                console.log(`[${new Date().toISOString()}] No filtercall sub created for receiver ${data.uniqueID}. Receiver sub: ${!!receiverSubscription}, Plan: ${receiverSubscription?.planName}, Caller Gender: ${callerUser.gender}`);
            }

          } catch (subError) {
              console.error(`[${new Date().toISOString()}] Error creating filtercall subscriptions:`, subError);
          }


          io.to(callerUser.id).emit("message", {
            type: "answer_received",
            name: userToReceiveAnswer.name, // Send receiver's name
            data: data.data.sdp,
            callId: data.callId // Pass the callId
          });
           console.log(`[${new Date().toISOString()}] Answer sent to ${callerUser.uniqueID} (socket ${callerUser.id}) for call ID: ${data.callId}`);
        } else {
           console.warn(`[${new Date().toISOString()}] User to receive answer or caller not found. Receiver UniqueID: ${data.uniqueID}, Caller UniqueID: ${data.callerId}`);
             socket.emit("error", { message: "Could not complete call setup. User not found." });
        }
        break;

      case "ice_candidate":
        console.log(`[${new Date().toISOString()}] Handling ice_candidate from ${socket.id} for target ${data.uniqueID}`);
         if (!data.data?.sdpMLineIndex || !data.data?.sdpMid || !data.data?.sdpCandidate || !data.uniqueID) {
             socket.emit("error", { message: "Invalid ICE candidate data" });
             return;
         }

        const userToReceiveIceCandidate = connectedUsers.get(data.uniqueID); // This is the target user's uniqueID
        if (userToReceiveIceCandidate) {
          console.log(`[${new Date().toISOString()}] User to receive ICE candidate found: ${userToReceiveIceCandidate.uniqueID} (socket ${userToReceiveIceCandidate.id}).`);
          io.to(userToReceiveIceCandidate.id).emit("message", {
            type: "ice_candidate",
            // It's good practice to send the sender's ID or name if needed by the client
            senderUniqueId: data.senderUniqueId || data.uniqueID, // Assuming the sender's unique ID is available
            data: {
              sdpMLineIndex: data.data.sdpMLineIndex,
              sdpMid: data.data.sdpMid,
              sdpCandidate: data.data.sdpCandidate,
            },
          });
           console.log(`[${new Date().toISOString()}] ICE candidate sent to ${userToReceiveIceCandidate.uniqueID}.`);
        } else {
           console.warn(`[${new Date().toISOString()}] User to receive ICE candidate not found for uniqueID: ${data.uniqueID}.`);
        }
        break;

      case "call_ended":
         console.log(`[${new Date().toISOString()}] Handling call_ended from ${socket.id} (user ${data.uniqueID}) for call ID ${data.callId}`);
         if (!data.uniqueID || !data.callId) {
              socket.emit("error", { message: "Missing uniqueID or callId for end_call" });
              return;
         }

         // Find and remove the call from ongoingCalls
        const callIndex = ongoingCalls.findIndex(
          (call) => call.callId === data.callId && (call.caller === data.uniqueID || call.receiver === data.uniqueID)
        );

        let endedCall = null;
        if (callIndex !== -1) {
             endedCall = ongoingCalls.splice(callIndex, 1)[0];
             console.log(`[${new Date().toISOString()}] Removed call ${data.callId} from ongoing calls.`);

             // Notify the other participant that the call has ended
             const otherParticipantId = endedCall.caller === data.uniqueID ? endedCall.receiver : endedCall.caller;
             const otherParticipant = connectedUsers.get(otherParticipantId);

             if (otherParticipant) {
                  console.log(`[${new Date().toISOString()}] Notifying other participant ${otherParticipant.uniqueID} (socket ${otherParticipant.id}) that call ${data.callId} ended.`);
                  io.to(otherParticipant.id).emit("message", {
                     type: "call_ended",
                     data: "The other user has ended the call.",
                     callId: data.callId // Send the call ID that ended
                  });

             }

              // Update CallHistory status to 'ended'
              try {
                   await CallHistory.updateOne(
                       { _id: data.callId, status: { $in: ["pending", "answered"] } }, // Update if pending or answered
                       { status: "ended", endedAt: new Date() } // Mark as ended
                   );
                  console.log(`[${new Date().toISOString()}] Updated CallHistory status to ended for call ID: ${data.callId}`);
              } catch (historyError) {
                  console.error(`[${new Date().toISOString()}] Error updating CallHistory for ended call ${data.callId}:`, historyError);
              }
        } else {
            console.warn(`[${new Date().toISOString()}] Received end_call for unknown or already ended call ID: ${data.callId}`);
            // Even if the call entry wasn't found in ongoingCalls, try to update CallHistory
             try {
                   await CallHistory.updateOne(
                       { _id: data.callId, status: { $in: ["pending", "answered"] } },
                       { status: "ended", endedAt: new Date() }
                   );
                   // If matchedCount is 0, it was likely already ended or didn't exist
                   console.log(`[${new Date().toISOString()}] Attempted CallHistory update for potentially stale call ID: ${data.callId}`);
              } catch (historyError) {
                  console.error(`[${new Date().toISOString()}] Error updating CallHistory for potentially stale ended call ${data.callId}:`, historyError);
              }
        }


        // Auto-connect to next available user for the user who ended the call
        const currentUser = connectedUsers.get(data.uniqueID);
        if (currentUser) {
             console.log(`[${new Date().toISOString()}] Finding next available user for ${currentUser.uniqueID} after ending call.`);
             socket.emit("message", { type: "status", data: "Searching for a partner..." }); // Inform the user they are searching

             const nextAvailableUser = await findAvailableUser(currentUser.uniqueID, currentUser.gender);

              if (nextAvailableUser) {
                 console.log(`[${new Date().toISOString()}] Found next available user ${nextAvailableUser.uniqueID} for ${currentUser.uniqueID}. Initiating next call.`);
                const newCallId = new mongoose.Types.ObjectId().toString();
                 ongoingCalls.push({
                   caller: currentUser.uniqueID,
                   receiver: nextAvailableUser.uniqueID,
                   callId: newCallId,
                   startTime: new Date()
                 });

                 // Notify the user who ended the call about the next connection
                 socket.emit("message", {
                   type: "call_connected",
                   data: nextAvailableUser.uniqueID,
                   name: nextAvailableUser.name,
                   gender: nextAvailableUser.gender,
                   callId: newCallId // Pass the new callId
                 });

                 // Notify the next available user about the incoming call
                 io.to(nextAvailableUser.id).emit("message", {
                    type: "call_incoming",
                    data: currentUser.uniqueID,
                    name: currentUser.name,
                    gender: currentUser.gender,
                    callId: newCallId // Pass the new callId
                 });

              } else {
                 console.log(`[${new Date().toISOString()}] No next available user found for ${currentUser.uniqueID}.`);
                 socket.emit("message", {
                   type: "call_connected", // Use call_connected with null data to indicate no partner found
                   data: "No available user for the next call",
                   name: '',
                   gender: '',
                   callId: null
                 });
              }
        }
        break;

        case "call_missed":
            console.log(`[${new Date().toISOString()}] Handling call_missed from ${socket.id} (user ${data.uniqueID}) for call ID ${data.callId}`);
             if (!data.uniqueID || !data.callId) {
                  socket.emit("error", { message: "Missing uniqueID or callId for call_missed" });
                  return;
             }
             try {
                  const result = await CallHistory.updateOne(
                      { _id: data.callId, status: "pending" }, // Only update if still pending
                      { status: "missed", endedAt: new Date() } // Assuming missed calls also have an effective end time
                  );
                   if (result.nModified > 0) {
                       console.log(`[${new Date().toISOString()}] Updated CallHistory status to missed for call ID: ${data.callId}`);
                   } else {
                       console.log(`[${new Date().toISOString()}] CallHistory for ID ${data.callId} was not pending or not found, status not updated to missed.`);
                   }
             } catch (historyError) {
                 console.error(`[${new Date().toISOString()}] Error updating CallHistory for missed call ${data.callId}:`, historyError);
             }
              // Remove from ongoing calls if it was somehow still there (shouldn't be if marked missed)
              ongoingCalls = ongoingCalls.filter(call => call.callId !== data.callId);

            // Logic to find the next available user for the user who missed the call
            const missedCallUser = connectedUsers.get(data.uniqueID);
            if (missedCallUser) {
                 console.log(`[${new Date().toISOString()}] Finding next available user for ${missedCallUser.uniqueID} after missing a call.`);
                 socket.emit("message", { type: "status", data: "Searching for a partner..." }); // Inform the user they are searching

                 const nextAvailableUser = await findAvailableUser(missedCallUser.uniqueID, missedCallUser.gender);

                 if (nextAvailableUser) {
                      console.log(`[${new Date().toISOString()}] Found next available user ${nextAvailableUser.uniqueID} for ${missedCallUser.uniqueID}. Initiating next call.`);
                     const newCallId = new mongoose.Types.ObjectId().toString();
                     ongoingCalls.push({
                       caller: missedCallUser.uniqueID,
                       receiver: nextAvailableUser.uniqueID,
                       callId: newCallId,
                        startTime: new Date()
                     });

                     // Notify the user about the next connection
                     socket.emit("message", {
                       type: "call_connected",
                       data: nextAvailableUser.uniqueID,
                       name: nextAvailableUser.name,
                       gender: nextAvailableUser.gender,
                       callId: newCallId // Pass the new callId
                     });

                     // Notify the next available user about the incoming call
                     io.to(nextAvailableUser.id).emit("message", {
                        type: "call_incoming",
                        data: missedCallUser.uniqueID,
                        name: missedCallUser.name,
                        gender: missedCallUser.gender,
                        callId: newCallId // Pass the new callId
                     });

                 } else {
                    console.log(`[${new Date().toISOString()}] No next available user found for ${missedCallUser.uniqueID} after missing call.`);
                     socket.emit("message", {
                       type: "call_connected", // Use call_connected with null data
                       data: "No available user for the next call",
                       name: '',
                       gender: '',
                       callId: null
                     });
                 }
            }
            break;


        case "call_rejected":
             console.log(`[${new Date().toISOString()}] Handling call_rejected from ${socket.id} (user ${data.uniqueID}) for call ID ${data.callId}`);
             if (!data.uniqueID || !data.callId) {
                  socket.emit("error", { message: "Missing uniqueID or callId for call_rejected" });
                  return;
             }

             // Find the call in ongoingCalls and remove it
              const rejectedCallIndex = ongoingCalls.findIndex(
                (call) => call.callId === data.callId && call.receiver === data.uniqueID // The receiver is the one rejecting
              );

              let rejectedCall = null;
              if (rejectedCallIndex !== -1) {
                   rejectedCall = ongoingCalls.splice(rejectedCallIndex, 1)[0];
                   console.log(`[${new Date().toISOString()}] Removed rejected call ${data.callId} from ongoing calls.`);

                   // Notify the caller that the call was rejected
                   const callerId = rejectedCall.caller;
                   const caller = connectedUsers.get(callerId);

                   if (caller) {
                        console.log(`[${new Date().toISOString()}] Notifying caller ${caller.uniqueID} (socket ${caller.id}) that call ${data.callId} was rejected.`);
                         io.to(caller.id).emit("message", {
                            type: "call_rejected",
                            data: "The call was rejected.",
                            callId: data.callId
                         });

                         // Find the next available user for the caller
                          console.log(`[${new Date().toISOString()}] Finding next available user for caller ${caller.uniqueID} after rejection.`);
                           io.to(caller.id).emit("message", { type: "status", data: "Searching for a partner..." }); // Inform the caller they are searching

                         const nextAvailableUser = await findAvailableUser(caller.uniqueID, caller.gender);

                         if (nextAvailableUser) {
                              console.log(`[${new Date().toISOString()}] Found next available user ${nextAvailableUser.uniqueID} for caller ${caller.uniqueID}. Initiating next call.`);
                             const newCallId = new mongoose.Types.ObjectId().toString();
                             ongoingCalls.push({
                               caller: caller.uniqueID,
                               receiver: nextAvailableUser.uniqueID,
                               callId: newCallId,
                               startTime: new Date()
                             });

                             // Notify the caller about the next connection
                             io.to(caller.id).emit("message", {
                               type: "call_connected",
                               data: nextAvailableUser.uniqueID,
                               name: nextAvailableUser.name,
                               gender: nextAvailableUser.gender,
                               callId: newCallId // Pass the new callId
                             });

                              // Notify the next available user about the incoming call
                               io.to(nextAvailableUser.id).emit("message", {
                                  type: "call_incoming",
                                  data: caller.uniqueID,
                                  name: caller.name,
                                  gender: caller.gender,
                                  callId: newCallId // Pass the new callId
                               });


                         } else {
                            console.log(`[${new Date().toISOString()}] No next available user found for caller ${caller.uniqueID} after rejection.`);
                             io.to(caller.id).emit("message", {
                               type: "call_connected", // Use call_connected with null data
                               data: "No available user for the next call",
                               name: '',
                               gender: '',
                               callId: null
                             });
                         }
                   }

                   // Update CallHistory status to 'rejected'
                   try {
                        await CallHistory.updateOne(
                            { _id: data.callId, status: "pending" }, // Only update if still pending
                            { status: "rejected", endedAt: new Date() }
                        );
                        console.log(`[${new Date().toISOString()}] Updated CallHistory status to rejected for call ID: ${data.callId}`);
                   } catch (historyError) {
                       console.error(`[${new Date().toISOString()}] Error updating CallHistory for rejected call ${data.callId}:`, historyError);
                   }

              } else {
                  console.warn(`[${new Date().toISOString()}] Received call_rejected for unknown or already handled call ID: ${data.callId}`);
                    // Even if the call entry wasn't found in ongoingCalls, try to update CallHistory
                     try {
                           await CallHistory.updateOne(
                               { _id: data.callId, status: "pending" },
                               { status: "rejected", endedAt: new Date() }
                           );
                           // If matchedCount is 0, it was likely already handled
                           console.log(`[${new Date().toISOString()}] Attempted CallHistory update for potentially stale rejected call ID: ${data.callId}`);
                      } catch (historyError) {
                          console.error(`[${new Date().toISOString()}] Error updating CallHistory for potentially stale rejected call ${data.callId}:`, historyError);
                      }
              }

              // The user who rejected the call (data.uniqueID) is now available for a new call.
              // Find the next available user for the user who rejected the call.
                const rejectingUser = connectedUsers.get(data.uniqueID);
                if (rejectingUser) {
                     console.log(`[${new Date().toISOString()}] Finding next available user for rejecting user ${rejectingUser.uniqueID}.`);
                     socket.emit("message", { type: "status", data: "Searching for a partner..." }); // Inform the rejecting user they are searching

                     const nextAvailableUserForRejector = await findAvailableUser(rejectingUser.uniqueID, rejectingUser.gender);

                      if (nextAvailableUserForRejector) {
                           console.log(`[${new Date().toISOString()}] Found next available user ${nextAvailableUserForRejector.uniqueID} for rejecting user ${rejectingUser.uniqueID}. Initiating next call.`);
                         const newCallId = new mongoose.Types.ObjectId().toString();
                         ongoingCalls.push({
                           caller: rejectingUser.uniqueID,
                           receiver: nextAvailableUserForRejector.uniqueID,
                           callId: newCallId,
                            startTime: new Date()
                         });

                         // Notify the rejecting user about the next connection
                         socket.emit("message", {
                           type: "call_connected",
                           data: nextAvailableUserForRejector.uniqueID,
                           name: nextAvailableUserForRejector.name,
                           gender: nextAvailableUserForRejector.gender,
                           callId: newCallId // Pass the new callId
                         });

                          // Notify the next available user about the incoming call
                            io.to(nextAvailableUserForRejector.id).emit("message", {
                               type: "call_incoming",
                               data: rejectingUser.uniqueID,
                               name: rejectingUser.name,
                               gender: rejectingUser.gender,
                               callId: newCallId // Pass the new callId
                            });

                      } else {
                         console.log(`[${new Date().toISOString()}] No next available user found for rejecting user ${rejectingUser.uniqueID}.`);
                          socket.emit("message", {
                            type: "call_connected", // Use call_connected with null data
                            data: "No available user for the next call",
                            name: '',
                            gender: '',
                            callId: null
                          });
                      }
                }

             break;


      default:
        console.warn(`[${new Date().toISOString()}] Unknown message type received from ${socket.id}: ${data.type}`);
        socket.emit("error", { message: `Unknown message type: ${data.type}` });
        break;
    }
  });

  socket.on("disconnect", async () => {
     console.log(`[${new Date().toISOString()}] Connection closed: ${socket.id}`);

    // Find and remove the disconnected user from the map
    let disconnectedUser = null;
    for (const [uniqueID, user] of connectedUsers.entries()) {
        if (user.id === socket.id) {
            disconnectedUser = user;
            connectedUsers.delete(uniqueID);
            console.log(`[${new Date().toISOString()}] Removed user ${uniqueID} from connected users.`);
            break; // Exit loop once user is found and removed
        }
    }

    if (disconnectedUser) {
        // Find and remove any ongoing calls involving the disconnected user
        const callsToUpdate = ongoingCalls.filter(
            (call) => call.caller === disconnectedUser.uniqueID || call.receiver === disconnectedUser.uniqueID
        );

         ongoingCalls = ongoingCalls.filter(
            (call) => call.caller !== disconnectedUser.uniqueID && call.receiver !== disconnectedUser.uniqueID
         );

        console.log(`[${new Date().toISOString()}] Removed ${callsToUpdate.length} ongoing call(s) involving ${disconnectedUser.uniqueID}.`);

        // Update the status of the ended calls in CallHistory
        for (const call of callsToUpdate) {
            try {
                 await CallHistory.updateOne(
                       { _id: call.callId, status: { $in: ["pending", "answered"] } }, // Update if pending or answered
                       { status: "ended_disconnect", endedAt: new Date() } // Mark as ended due to disconnect
                   );
                 console.log(`[${new Date().toISOString()}] Updated CallHistory status to ended_disconnect for call ID: ${call.callId}`);
            } catch (historyError) {
                 console.error(`[${new Date().toISOString()}] Error updating CallHistory for disconnected user call ${call.callId}:`, historyError);
            }

            // Notify the other participant in the call that the user disconnected
            const otherParticipantId = call.caller === disconnectedUser.uniqueID ? call.receiver : call.caller;
             const otherParticipant = connectedUsers.get(otherParticipantId);

             if (otherParticipant) {
                  console.log(`[${new Date().toISOString()}] Notifying other participant ${otherParticipant.uniqueID} (socket ${otherParticipant.id}) about disconnect of ${disconnectedUser.uniqueID} for call ${call.callId}.`);
                  io.to(otherParticipant.id).emit("message", {
                     type: "call_ended_disconnect",
                     data: "The other user has disconnected.",
                     callId: call.callId // Send the call ID that ended
                  });

                  // Find the next available user for the other participant
                    console.log(`[${new Date().toISOString()}] Finding next available user for ${otherParticipant.uniqueID} after other party disconnected.`);
                     io.to(otherParticipant.id).emit("message", { type: "status", data: "Searching for a partner..." }); // Inform the user they are searching

                     const nextAvailableUser = await findAvailableUser(otherParticipant.uniqueID, otherParticipant.gender);

                     if (nextAvailableUser) {
                          console.log(`[${new Date().toISOString()}] Found next available user ${nextAvailableUser.uniqueID} for ${otherParticipant.uniqueID}. Initiating next call.`);
                         const newCallId = new mongoose.Types.ObjectId().toString();
                         ongoingCalls.push({
                           caller: otherParticipant.uniqueID,
                           receiver: nextAvailableUser.uniqueID,
                           callId: newCallId,
                           startTime: new Date()
                         });

                         // Notify the participant about the next connection
                         io.to(otherParticipant.id).emit("message", {
                           type: "call_connected",
                           data: nextAvailableUser.uniqueID,
                           name: nextAvailableUser.name,
                           gender: nextAvailableUser.gender,
                           callId: newCallId // Pass the new callId
                         });

                         // Notify the next available user about the incoming call
                         io.to(nextAvailableUser.id).emit("message", {
                            type: "call_incoming",
                            data: otherParticipant.uniqueID,
                            name: otherParticipant.name,
                            gender: otherParticipant.gender,
                            callId: newCallId // Pass the new callId
                         });

                     } else {
                        console.log(`[${new Date().toISOString()}] No next available user found for ${otherParticipant.uniqueID} after disconnect.`);
                         io.to(otherParticipant.id).emit("message", {
                           type: "call_connected", // Use call_connected with null data
                           data: "No available user for the next call",
                           name: '',
                           gender: '',
                           callId: null
                         });
                     }
             }
        }
    } else {
       console.log(`[${new Date().toISOString()}] Disconnected socket ${socket.id} was not associated with a stored user.`);
    }
  });
});

