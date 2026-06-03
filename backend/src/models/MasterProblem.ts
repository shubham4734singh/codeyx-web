import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformLinks {
  leetcode?: string;
  geeksforgeeks?: string;
  gfg?: string;
  hackerrank?: string;
  codechef?: string;
  codeforces?: string;
  atcoder?: string;
  neetcode?: string;
  codingninjas?: string;
  interviewbit?: string;
  spoj?: string;
  cses?: string;
}

export interface IVideoResource {
  title: string;
  platform: string;
  url: string;
}

export interface IEditorialResource {
  platform: string;
  url: string;
  title?: string;
}

export interface IMasterProblem extends Document {
  problemId: number;
  title: string;
  titleKey: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  platform: string;
  link: string;
  links: IPlatformLinks;
  youtubeUrl: string;
  articleUrl: string;
  videos: IVideoResource[];
  editorials: IEditorialResource[];
  tags: string[];
  companies: string[];
  patterns: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VideoResourceSchema = new Schema<IVideoResource>(
  {
    title: { type: String, default: '' },
    platform: { type: String, default: 'YouTube' },
    url: { type: String, default: '' },
  },
  { _id: false }
);

const EditorialResourceSchema = new Schema<IEditorialResource>(
  {
    platform: { type: String, default: '' },
    url: { type: String, default: '' },
    title: { type: String, default: '' },
  },
  { _id: false }
);

const MasterProblemSchema = new Schema<IMasterProblem>(
  {
    problemId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    titleKey: { type: String, required: true, unique: true, index: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    platform: { type: String, default: '' },
    link: { type: String, default: '' },
    links: {
      leetcode: { type: String, default: '' },
      geeksforgeeks: { type: String, default: '' },
      hackerrank: { type: String, default: '' },
      codechef: { type: String, default: '' },
      codeforces: { type: String, default: '' },
      atcoder: { type: String, default: '' },
      neetcode: { type: String, default: '' },
      codingninjas: { type: String, default: '' },
      interviewbit: { type: String, default: '' },
      spoj: { type: String, default: '' },
      cses: { type: String, default: '' },
    },
    youtubeUrl: { type: String, default: '' },
    articleUrl: { type: String, default: '' },
    videos: [VideoResourceSchema],
    editorials: [EditorialResourceSchema],
    tags: [{ type: String }],
    companies: [{ type: String }],
    patterns: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MasterProblem = mongoose.model<IMasterProblem>('MasterProblem', MasterProblemSchema);
