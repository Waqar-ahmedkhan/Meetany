import { Schema, model } from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';

const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
};

const UserSchema = new Schema({
  name: {
    type: String,
    required: false,
  },
  mail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  age: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: false
  },
  relationship_goal: {
    type: String,
    required: false,
  },
  refferal_code: {
    type: String,
    required: false,
  },
  user_code: {
    type: String,
    required: false,
  },
  looking_for: {
    type: String,
    default: "both",
  },
  user_type: {
    type: String,
    default: "user",
  },
  image: {
    type: String,
    required: false,
  },
  country: {
    type: String,
    required: false,
  },
  bio: {
    type: String,
    required: false,
  },
  device_type: {
    type: String,
    required: false,
  },
  device_id: {
    type: String,
    required: false,
  },
  device_token: {
    type: String,
    required: false,
  },
}, schemaOptions);

UserSchema.methods = {
  jwtToken() {
    return jwt.sign(
      { id: this._id },
      process.env.JWT_SECRET, { expiresIn: '24h' }
    );
  }
}

const User = model("User", UserSchema);

export { User };