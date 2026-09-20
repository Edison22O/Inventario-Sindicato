import { useState } from 'react';
import { Users, Database, Shield, LayoutDashboard, Settings as SettingsIcon, Activity, Gauge } from 'lucide-react';
import UserManagement from '../components/UserManagement';
import SystemBackups from '../components/SystemBackups';
import GlobalDashboard from '../components/GlobalDashboard';
import SystemSettingsPanel from '../components/SystemSettingsPanel';
import AuditLogs from '../components/AuditLogs';
import { SystemPerformanceMetrics } from '../components/SystemPerformanceMetrics';

const SettingsDashboard = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'performance' | 'users' | 'settings' | 'backups' | 'audit'>('dashboard');

  const navTabs = [
    { id: 'dashboard', label: 'Supervisión General', icon: LayoutDashboard },
    { id: 'performance', label: 'Rendimiento del Sistema', icon: Gauge },
    { id: 'users', label: 'Usuarios y Roles', icon: Users },
    { id: 'audit', label: 'Auditoría del Sistema', icon: Activity },
    { id: 'settings', label: 'Organización', icon: SettingsIcon },
    { id: 'backups', label: 'Base de Datos y Respaldos', icon: Database },
  ];

  return (
    <div className="flex-1 p-4 sm:p-8 bg-gray-50/50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-900 text-gold-400 rounded-2xl shadow-md border border-emerald-800">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Panel de Control & Supervisión
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                Administración centralizada, monitoreo en tiempo real y seguridad del sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Custom Navigation Pills */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold text-xs transition-all ${
                    isActive
                      ? 'bg-emerald-900 text-white shadow-md shadow-emerald-900/10'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && <GlobalDashboard />}
          {activeTab === 'performance' && <SystemPerformanceMetrics />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'audit' && <AuditLogs />}
          {activeTab === 'settings' && <SystemSettingsPanel />}
          {activeTab === 'backups' && <SystemBackups />}
        </div>
      </div>
    </div>
  );
};

export default SettingsDashboard;
