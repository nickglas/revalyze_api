// models/refreshToken.model.ts
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  ip: String,
  userAgent: String,
});

export default mongoose.model('RefreshToken', refreshTokenSchema);