import { User } from '../types';
import { useAuthContext } from './auth-context';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    error,
    clearError,
  } = useAuthContext();

  return {
    user: user as User | null,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    error,
    clearError,
  };
}
