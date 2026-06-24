// Location types
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Zone {
  id: string;
  name: string;
  center: LatLng;
  radius: number; // meters
  color?: string;
}

export interface LocationState {
  currentLocation: LatLng | null;
  isInZone: boolean;
  distanceToZone: number | null;
  nearestZone: Zone | null;
  isTracking: boolean;
  error: string | null;
}

// Face recognition types
export interface FaceProfile {
  id: string;
  name: string;
  photoUris: string[]; // stored photo URIs
  createdAt: string;
  updatedAt: string;
}

export interface VerificationResult {
  isMatch: boolean;
  confidence: number; // 0-1
  matchedProfile: FaceProfile | null;
  timestamp: string;
}

export interface CheckIn {
  id: number;
  profileId: string;
  profileName: string;
  zone: Zone;
  verification: VerificationResult;
  location: LatLng;
  timestamp: string;
}

// App state
export type AppScreen = 'dashboard' | 'register' | 'verify' | 'profiles' | 'settings';

export interface AppState {
  profiles: FaceProfile[];
  zones: Zone[];
  checkIns: CheckIn[];
  selectedProfile: FaceProfile | null;
}

// Authentication types
export type UserRole = 'admin' | 'user';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: UserAccount | null;
  isFirstRun: boolean;
}
