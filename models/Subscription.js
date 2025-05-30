import { Schema, model, mongoose } from "mongoose";
const schemaOptions = {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
};
const subscriptionSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "manual",
        "subscription",
        "referral",
        "filter",
        "filtercall",
        "free",
      ],
      required: true,
    },
    cost: { type: Number, required: true },
    stars: { type: Number, required: true },
    taken_date: { type: Date, default: Date.now },
    expiry_date: { type: Date, default: null }, // Null for "manual" and "referral"
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    referral_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    }, // Only for "referral"
    planName: { type: String, default: null }, // Null for "manual" and "referral",
  },
  { schemaOptions }
);

const Subscription = model("Subscription", subscriptionSchema);
export { Subscription };
