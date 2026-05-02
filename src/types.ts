export interface Point {
  id: number;
  name: string;
  points: number;
  lat: number;
  lon: number;
  description: string;
  image_url: string;
}

export interface Visit {
  pointId: number;
  timestamp: number;
  photoBase64?: string;
}

export interface User {
  id: string;
  uid?: string;
  email: string;
  fullName: string;
  phone: string;
  motorcycle: string;
  avatarBase64?: string;
  referredBy?: string | null;
  referralCode?: string;
  totalPoints: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}
