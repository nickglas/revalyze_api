import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ICompany } from './company.model';

export interface IUser extends Document {
  email: string;
  name: string;
  password: string;
  companyId: mongoose.Types.ObjectId | ICompany;
  isActive: boolean;
  role: 'employee' | 'company_admin' | 'super_admin';
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    isActive: { type: Boolean, required: true, default: true },
    role: {
      type: String,
      enum: ['employee', 'company_admin', 'super_admin'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string) {
  return await bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
