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
  },

  isGlobalAdmin: (): boolean => {
    const role = authService.getUserRole();
    if (!role) return false;
    const r = role.toLowerCase();
    return (r === 'administrador' || r === 'admin' || r === 'superadmin') && !r.includes('flota') && !r.includes('vehiculo') && !r.includes('vehículo');
  },

  isAdmin: (): boolean => {
    const role = authService.getUserRole();
    if (!role) return false;
    const r = role.toLowerCase();
    return r.includes('admin') || r.includes('administrador');
  },

  isConductor: (): boolean => {
    const role = authService.getUserRole();
    if (!role) return false;
    const r = role.toLowerCase();
    return r.includes('conductor') || r.includes('chofer') || r.includes('driver');
  },

  isTech: (): boolean => {
    const role = authService.getUserRole();
    if (!role) return false;
    const r = role.toLowerCase();
    return r.includes('tecnolog') || r.includes('tech');
  },

  isFurniture: (): boolean => {
    const role = authService.getUserRole();
    if (!role) return false;
    const r = role.toLowerCase();
    return r.includes('mueble') || r.includes('mobiliario') || r.includes('furniture');
  },

  isVehicleAdmin: (): boolean => {
    if (authService.isGlobalAdmin()) return true;
    const role = authService.getUserRole();
    if (!role) return false;
    const r = role.toLowerCase();
    return r.includes('flota') || (r.includes('admin') && (r.includes('vehiculo') || r.includes('vehículo')));
  },

  isConductorOnly: (): boolean => {
    return authService.isConductor() && !authService.isVehicleAdmin();
  }
};
