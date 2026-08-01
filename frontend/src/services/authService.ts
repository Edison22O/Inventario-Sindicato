import api from '@/shared/services/api';
import type { LoginCredentials, AuthResponse } from '@/shared/types';
import { jwtDecode } from 'jwt-decode';
// Force Vite HMR reload

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/token/', credentials);
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },

  getUserRole: (): string | null => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const decoded = jwtDecode<any>(token);
      return decoded.role || null;
    } catch (e) {
      console.error("Error decoding JWT:", e);
      return null;
    }
  },

  getUserName: (): string | null => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const decoded = jwtDecode<any>(token);
      return decoded.username || null;
    } catch (e) {
      console.error("Error decoding JWT:", e);
      return null;
    }
  }
};
