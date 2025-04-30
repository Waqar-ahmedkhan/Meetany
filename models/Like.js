import { Schema, model } from 'mongoose';
const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
};
const LikeSchema = new Schema({
  user_id: { // User who liked the profile
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  liked_user_id: { // Profile that was liked
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, { schemaOptions });

const Like = model("Like", LikeSchema);
export { Like };
