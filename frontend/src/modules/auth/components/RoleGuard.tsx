import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '@/services/authService';

interface RoleGuardProps {
  allowedRoles: string[];
  children?: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const userRole = authService.getUserRole();

  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  if (authService.isAdmin()) {
    return children ? <>{children}</> : <Outlet />;
  }

  const isAllowed = allowedRoles.some(role => {
    const target = role.toLowerCase();
    if (target.includes('vehicle_admin') || target.includes('vehiculo_admin') || target.includes('admin_vehiculo')) return authService.isVehicleAdmin();
    if (target.includes('conductor') || target.includes('chofer')) return authService.isConductor();
    if (target.includes('tecnolog')) return authService.isTech();
    if (target.includes('mueble') || target.includes('mobiliario')) return authService.isFurniture();
    if (target.includes('admin')) return authService.isAdmin();
    return userRole.toLowerCase() === target;
  });

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleGuard;
