import { Schema, model } from 'mongoose';
const schemaOptions = {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  };
const ReportSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reported_user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  report_reason: { 
    type: String,
	required: true,
  },
},  schemaOptions);

const Report = model("Report", ReportSchema);
export { Report };



