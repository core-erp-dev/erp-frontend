export interface User {
  username: string;
  email: string | null;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    username: string;
    email: string | null;
    roles: string[];
    permissions: string[];
  };
}

export interface RefreshResponse {
  status: string;
  message: string;
  data: {
    accessToken: string;
  };
}
