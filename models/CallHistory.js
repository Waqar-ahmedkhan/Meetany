import { Schema, model,mongoose } from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
};
const CallHistorySchema = new Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['missed', 'completed', 'cancelled'],
    required: true
  },
}, schemaOptions);

const CallHistory = model("CallHistory", CallHistorySchema);
export { CallHistory };
