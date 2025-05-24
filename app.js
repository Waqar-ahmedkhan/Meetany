import http from 'http';
import { Server as SocketIO } from 'socket.io';
import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import { Block } from './models/Block.js';
import { User } from './models/User.js';
import { Subscription } from './models/Subscription.js';
import { CallHistory } from './models/CallHistory.js';
import multer from 'multer';
import crypto from 'crypto';
import connectDB from './config/Database.js';
import userRoute from './routes/userRoutes.js';
import subscriptionRoute from './routes/subscriptionRoutes.js';
import interactionRoute from './routes/interactionRoutes.js';
import authRoute from './routes/auth.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from './config/passport.js';

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
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
    cookie: { secure: process.env.NODE_ENV === 'production' },
  })
);
app.use(passport.initialize());
app.use(passport.session());
import cors from 'cors';
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
// Routes
app.use('/api', userRoute);
app.use('/api', subscriptionRoute);
app.use('/api', interactionRoute);
app.use('/api/auth', authRoute);

app.use('/images', express.static('uploads'));
app.get('/images/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const imageUrl = `/images/${fileName}`;
  res.redirect(imageUrl);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 500, message: `Server Error: ${err.message}` });
});

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIO(server);

const users = [];
let ongoingCalls = [];

async function getUserCurrentStars(userId) {
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

async function manageReferrals(id) {
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

async function generateUserCode() {
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

const findAvailableUser = async (currentUserId, currentUserGender) => {
  console.log('currentUserId +++', currentUserId);
  if (currentUserId === '') {
    return null;
  }
  const preSubscribe = await Subscription.findOne({
    type: 'filter',
    user_id: currentUserId,
  });
  for (const user of users) {
    if (user.uniqueID === currentUserId) continue;
    if (preSubscribe && preSubscribe.planName !== user.gender) continue;
    const userSubscribe = await Subscription.findOne({
      type: 'filter',
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

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('new connection>>>', socket.id);

  socket.on('message', async (message) => {
    console.log('new message>>>', message);
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Invalid message format:', message);
      return;
    }
    console.log('parse message>>>', data);
    const user = findUser(data.uniqueID);

    switch (data.type) {
      case 'store_user':
        console.log('new store_user>>>');
        if (user) {
          socket.emit('message', {
            type: 'user already exists',
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
        const availableUser = await findAvailableUser(data.uniqueID, data.gender);
        console.log('availableUser>>>', availableUser);
        if (availableUser) {
          ongoingCalls.push({
            caller: data.uniqueID,
            receiver: availableUser.uniqueID,
          });
          socket.emit('message', {
            type: 'call_connected',
            data: availableUser.uniqueID,
            name: availableUser.name,
            gender: availableUser.gender,
          });
        } else {
          socket.emit('message', {
            type: 'call_connected',
            data: 'No available user for the call',
            name: '',
            gender: '',
          });
        }
        break;

      case 'start_call':
        console.log('new start_call>>>');
        let userToCall = findUser(data.uniqueID);
        if (userToCall) {
          socket.emit('message', {
            type: 'call_response',
            data: 'user is ready for call',
          });
        } else {
          socket.emit('message', {
            type: 'call_response',
            data: 'user is not online',
          });
        }
        break;

      case 'create_offer':
        console.log('new create_offer>>>');
        let userToReceiveOffer = findUser(data.uniqueID);
        const callLog = new CallHistory({
          caller: data.callerId,
          receiver: data.targetId,
          status: 'missed',
        });
        const call = await callLog.save();
        console.log('userToReceiveOffer>>>', userToReceiveOffer);
        if (userToReceiveOffer) {
          console.log('enter>>>');
          io.to(userToReceiveOffer.id).emit('message', {
            type: 'offer_received',
            name: userToReceiveOffer.name,
            uniqueID: userToReceiveOffer.uniqueID,
            callerId: data.callerId,
            data: data.data.sdp,
            callId: call._id,
          });
        }
        break;

      case 'create_answer':
        console.log('new create_answer>>>');
        let userToReceiveAnswer = findUser(data.uniqueID);
        console.log('userToReceiveAnswer>>>', userToReceiveAnswer);
        console.log('data>>>', data);
        if (userToReceiveAnswer) {
          console.log('calls complete');
          const isInCall = ongoingCalls.find(
            (call) =>
              call.caller === data.uniqueID || call.receiver === data.uniqueID
          );
          if (isInCall) {
            console.log('while answer ++ ', isInCall);
            let callerGender = findUser(isInCall.caller);
            console.log('callerGender ++ ', callerGender);
            let receiverGender = findUser(isInCall.receiver);
            console.log('receiverGender ++ ', receiverGender);
            const caller = await Subscription.findOne({
              type: 'filter',
              user_id: isInCall.caller,
            });
            if (
              caller &&
              caller.planName !== 'both' &&
              receiverGender.gender !== 'both' &&
              caller.planName === receiverGender.gender
            ) {
              await createSubscription(
                isInCall.caller,
                isInCall.receiver,
                caller.planName
              );
            }
            const receiver = await Subscription.findOne({
              type: 'filter',
              user_id: isInCall.receiver,
            });
            if (
              receiver &&
              receiver.planName !== 'both' &&
              callerGender.gender !== 'both' &&
              receiver.planName === callerGender.gender
            ) {
              await createSubscription(
                isInCall.receiver,
                isInCall.caller,
                receiver.planName
              );
            }
          }
          io.to(userToReceiveAnswer.id).emit('message', {
            type: 'answer_received',
            name: data.name,
            data: data.data.sdp,
          });
        }
        break;

      case 'ice_candidate':
        console.log('new ice_candidate>>>');
        console.log('data>>>', data);
        let userToReceiveIceCandidate = findUser(data.uniqueID);
        console.log('userToReceiveIceCandidate>>>>>', userToReceiveIceCandidate);
        if (userToReceiveIceCandidate) {
          console.log('calls enter');
          io.to(userToReceiveIceCandidate.id).emit('message', {
            type: 'ice_candidate',
            name: data.name,
            data: {
              sdpMLineIndex: data.data.sdpMLineIndex,
              sdpMid: data.data.sdpMid,
              sdpCandidate: data.data.sdpCandidate,
            },
          });
        }
        break;

      case 'end_call':
        console.log('new end_call>>>');
        let userToEndCall = findUser(data.uniqueID);
        if (userToEndCall) {
          io.to(userToEndCall.id).emit('message', {
            type: 'call_ended',
            name: data.name,
            data: 'call ended',
          });
        }
        const callIndex = ongoingCalls.findIndex(
          (call) =>
            (call.caller === data.uniqueID && call.receiver === data.uniqueID) ||
            (call.receiver === data.uniqueID && call.caller === data.uniqueID)
        );
        if (callIndex !== -1) ongoingCalls.splice(callIndex, 1);
        const nextAvailableUser = await findAvailableUser(data.uniqueID, data.gender);
        if (!nextAvailableUser) {
          socket.emit('message', {
            type: 'call_connected',
            data: 'No available user for the next call',
          });
        } else {
          ongoingCalls.push({
            caller: data.uniqueID,
            receiver: nextAvailableUser.uniqueID,
          });
          socket.emit('message', {
            type: 'call_connected',
            data: nextAvailableUser.uniqueID,
            name: nextAvailableUser.name,
            gender: nextAvailableUser.gender,
          });
        }
        break;
    }
  });

  socket.on('disconnect', () => {
    const userIndex = users.findIndex((user) => user.id === socket.id);
    let disconnectedUser = null;
    if (userIndex !== -1) {
      disconnectedUser = users.splice(userIndex, 1)[0];
    }
    ongoingCalls = ongoingCalls.filter(
      (call) =>
        call.caller !== disconnectedUser?.uniqueID &&
        call.receiver !== disconnectedUser?.uniqueID
    );
    console.log(
      `Cleaned up: Removed user ${
        disconnectedUser?.name || 'unknown'
      } from users and ongoing calls.`
    );
    console.log('connection closed:', socket.id);
  });
});

// Start server
server.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening on port ${process.env.PORT || 3000}`);
});