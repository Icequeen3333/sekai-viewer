import { IUserProfile, IEventInfo } from "./types.d";

export interface LanguageModel {
  id: number;
  code: string;
  name: string;
  enabled: boolean;
}

export interface UserRoleModel {
  name: string;
  description: string;
  type: string;
}

export interface UserMetadatumModel {
  id: number;
  avatar: {
    url: string;
  };
  nickname: string;
  languages: LanguageModel;
}

export interface UserModel {
  id: number;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  role: UserRoleModel;
  userMetadatum: UserMetadatumModel;
  avatarUrl?: string;
}
export interface LoginValues {
  identifier: string;
  password: string;
}

export interface LoginLocalApiReturn {
  user: UserModel;
  jwt: string;
}

export interface RegisterValues {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  languages: number[];
}

export interface SekaiProfileModel {
  id: number;
  user: UserModel;
  sekaiUserId: string | null;
  sekaiUserProfile: IUserProfile | null;
  sekaiUserToken: string | null;
  updateAvailable: number;
  updateUsed: number;
  eventGetAvailable: number;
  eventGetUsed: number;
  eventHistorySync: boolean;
  dailySyncEnabled: boolean;
}

export interface SekaiCurrentEventModel {
  eventId: number;
  eventJson: IEventInfo;
}

export interface SekaiProfileEventRecordModel {
  id: number;
  eventId: number;
  eventRank: number;
  eventPoint: number;
  created_at: Date;
  updated_at: Date;
}

export interface LanguageModel {
  id: number;
  code: string;
  name: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

// export interface CommentModel {
//   id: number;
//   content: string;
//   blocked?: boolean;
//   blockedThread?: boolean;
//   blockReason?: string;
//   points?: number;
//   authorUser: UserModel;
//   authorType?: string;
//   authorId?: string;
//   authorName?: string;
//   authorEmail?: string;
//   authorAvatar?: string;
//   relatedSlug: string;
//   created_by?: any;
//   updated_by?: any;
//   created_at: Date;
//   updated_at: Date;
//   reports: any[];
//   children: CommentModel[];
// }

export interface CommentModel {
  id: number;
  content: string;
  blocked?: boolean;
  blockedThread?: boolean;
  blockReason?: string;
  points?: number;
  authorUser: number | UserModel;
  authorType?: any;
  authorId?: any;
  authorName?: any;
  authorEmail?: any;
  authorAvatar?: any;
  threadOf?: any;
  created_at: Date;
  updated_at: Date;
}

export interface AnnouncementModel {
  id: number;
  title: string;
  description: string;
  content: string;
  category: string;
  showAt?: Date;
  user: UserModel;
  language: LanguageModel;
  isPin: boolean;
  published_at: Date;
  created_at: Date;
  updated_at: Date;
  comments: CommentModel[];
}

export type CommentAbuseReason = "OTHER" | "BAD_WORDS" | "DISCRIMINATION";