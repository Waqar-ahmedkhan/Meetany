import express from 'express';
import { Message } from '../models/Message.js';

const router = express.Router();

// Get messages for a specific call
router.get('/messages/:callId', async (req, res) => {
  try {
    const callId = req.params.callId;
    const messages = await Message.find({ call_id: callId })
      .populate('sender_id', 'name')
      .populate('receiver_id', 'name')
      .sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;