export interface User {
  id: string;
  email: string;
  name?: string;
  tier: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch?: string;
  status: 'pending' | 'importing' | 'ready' | 'error' | 'archived';
  importedById: string;
  importedAt: string;
  updatedAt: string;
  _count: {
    analyses: number;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  statusCode?: number;
}
