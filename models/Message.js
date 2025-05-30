import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  call_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallHistory',
    required: true,
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export const Message = mongoose.model('Message', messageSchema);