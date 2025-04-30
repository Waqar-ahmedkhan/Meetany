import { Schema, model } from 'mongoose';
const schemaOptions = {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  };
const BlockSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  blocked_user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
},  schemaOptions);

const Block = model("Block", BlockSchema);
export { Block };
