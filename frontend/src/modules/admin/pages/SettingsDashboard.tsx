import { useState } from 'react';
import { Users, Database, Shield, LayoutDashboard, Settings as SettingsIcon, Tags } from 'lucide-react';
import UserManagement from '../components/UserManagement';
import SystemBackups from '../components/SystemBackups';
import GlobalDashboard from '../components/GlobalDashboard';
import SystemSettingsPanel from '../components/SystemSettingsPanel';
import GlobalCatalogs from '../components/GlobalCatalogs';
import AuditLogs from '../components/AuditLogs';
import { Activity } from 'lucide-react';

const SettingsDashboard = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'catalogs' | 'settings' | 'backups' | 'audit'>('dashboard');

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-600" />
            Panel de Control
          </h1>
          <p className="text-gray-500">
            Administración centralizada de usuarios, roles y seguridad del sistema.
          </p>
        </div>

        {/* Custom Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 py-4 px-4 whitespace-nowrap border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'dashboard'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Visión General
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 py-4 px-4 whitespace-nowrap border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-5 h-5" />
            Usuarios y Roles
          </button>
          <button
            onClick={() => setActiveTab('catalogs')}
            className={`flex items-center gap-2 py-4 px-4 whitespace-nowrap border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'catalogs'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Tags className="w-5 h-5" />
            Catálogos Globales
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 py-4 px-4 whitespace-nowrap border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="w-5 h-5" />
            Auditoría
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-4 px-4 whitespace-nowrap border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            Organización
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 py-4 px-4 whitespace-nowrap border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'backups'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Database className="w-5 h-5" />
            Base de Datos y Respaldos
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in-up">
          {activeTab === 'dashboard' && <GlobalDashboard />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'catalogs' && <GlobalCatalogs />}
          {activeTab === 'audit' && <AuditLogs />}
          {activeTab === 'settings' && <SystemSettingsPanel />}
          {activeTab === 'backups' && <SystemBackups />}
        </div>
      </div>
    </div>
  );
};

export default SettingsDashboard;
