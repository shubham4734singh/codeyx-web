import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  platformName: string;
  supportEmail: string;
  siteDescription: string;
  maintenanceMode: boolean;
  alfaLeetcodeUrl: string;
  githubToken: string;
  adType: 'google' | 'custom' | 'none';
  googleAdClient: string;
  googleAdSlot: string;
  googleAdSlotSidebar: string;
  customAdImageUrl: string;
  customAdLinkUrl: string;
  customAdTitle: string;
  customAdDescription: string;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    platformName: { type: String, default: 'Codeyx' },
    supportEmail: { type: String, default: 'support@codeyx.com' },
    siteDescription: { 
      type: String, 
      default: 'Codeyx is a modern coding platform that provides coding sheets, programming contests, developer projects, and DSA practice.' 
    },
    maintenanceMode: { type: Boolean, default: false },
    alfaLeetcodeUrl: { type: String, default: 'https://alfa-leetcode-api.onrender.com' },
    githubToken: { type: String, default: '' },
    
    // Ad Settings
    adType: { type: String, enum: ['google', 'custom', 'none'], default: 'google' },
    googleAdClient: { type: String, default: 'ca-pub-2934790485812892' },
    googleAdSlot: { type: String, default: '' },
    googleAdSlotSidebar: { type: String, default: '' },
    customAdImageUrl: { type: String, default: '' },
    customAdLinkUrl: { type: String, default: '' },
    customAdTitle: { type: String, default: 'Learn Web Development' },
    customAdDescription: { type: String, default: 'Master React, Next.js, and Node.js with our premium paths.' },
  },
  { timestamps: true }
);

export const SystemSettings = mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
