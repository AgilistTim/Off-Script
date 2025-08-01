export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  createdAt: Date;
  lastLogin: Date;
  role: 'user' | 'admin' | 'parent';
  preferences?: UserPreferences;
  profile?: UserProfile;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  emailUpdates?: boolean;
  interestedSectors?: string[];
}

export interface UserProfile {
  displayName?: string;
  bio?: string;
  school?: string;
  grade?: string;
  interests?: string[];
  careerGoals?: string[];
  skills?: string[];
} 