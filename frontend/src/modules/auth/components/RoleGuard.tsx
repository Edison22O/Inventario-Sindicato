import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '@/services/authService';

interface RoleGuardProps {
  allowedRoles: string[];
  children?: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const userRole = authService.getUserRole();

  if (userRole !== 'Administrador' && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleGuard;
