import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from '@/modules/auth/components/ProtectedRoute';
import RoleGuard from '@/modules/auth/components/RoleGuard';
import Login from '@/modules/auth/pages/Login';
import Home from '@/modules/home/pages/Home';
import Dashboard from '@/modules/dashboard/pages/Dashboard';
import Categories from '@/modules/inventory/pages/Categories';
import Products from '@/modules/inventory/pages/Products';
import DiscardedProducts from '@/modules/inventory/pages/DiscardedProducts';
import Departments from '@/modules/inventory/pages/Departments';
import DepartmentInventory from '@/modules/inventory/pages/DepartmentInventory';
import CategoryInventory from '@/modules/inventory/pages/CategoryInventory';
import Suppliers from '@/modules/suppliers/pages/Suppliers';
import Maintenances from '@/modules/maintenance/pages/Maintenances';
import Reports from '@/modules/reports/pages/Reports';
import SettingsDashboard from '@/modules/admin/pages/SettingsDashboard';

// Furniture Modules
import FurnitureDashboard from '@/modules/furniture/dashboard/pages/Dashboard';
import FurnitureCategories from '@/modules/furniture/inventory/pages/Categories';
import FurnitureProducts from '@/modules/furniture/inventory/pages/Products';
import FurnitureDiscardedProducts from '@/modules/furniture/inventory/pages/DiscardedProducts';
import FurnitureDepartments from '@/modules/furniture/inventory/pages/Departments';
import FurnitureDepartmentInventory from '@/modules/furniture/inventory/pages/DepartmentInventory';
import FurnitureCategoryInventory from '@/modules/furniture/inventory/pages/CategoryInventory';
import FurnitureSuppliers from '@/modules/furniture/suppliers/pages/Suppliers';
import FurnitureMaintenances from '@/modules/furniture/maintenance/pages/Maintenances';
import FurnitureReports from '@/modules/furniture/reports/pages/Reports';

// Vehicles Modules
import VehiclesCatalog from '@/modules/vehicles/pages/VehiclesCatalog';
import VehicleTrips from '@/modules/vehicles/pages/VehicleTrips';
import VehiclesDashboard from '@/modules/vehicles/pages/VehiclesDashboard';
import TripHistory from '@/modules/vehicles/pages/TripHistory';
import DriversCatalog from '@/modules/vehicles/pages/DriversCatalog';
import DriverProfilePage from '@/modules/vehicles/pages/DriverProfile';
import VehicleProfile from '@/modules/vehicles/pages/VehicleProfile';
import VehicleReports from '@/modules/vehicles/pages/VehicleReports';
import VehicleMaintenances from '@/modules/vehicles/pages/VehicleMaintenances';
import VehicleMatriculas from '@/modules/vehicles/pages/VehicleMatriculas';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          
          {/* Inventory Modules (Tecnologico) */}
          <Route element={<RoleGuard allowedRoles={['Tecnologico']} />}>
            <Route path="/inventory-dashboard" element={<Dashboard />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:id" element={<CategoryInventory />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/departments/:id" element={<DepartmentInventory />} />
            <Route path="/products" element={<Products />} />
            <Route path="/maintenances" element={<Maintenances />} />
            <Route path="/discarded" element={<DiscardedProducts />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* Furniture Modules (Muebles) */}
          <Route element={<RoleGuard allowedRoles={['Muebles']} />}>
            <Route path="/furniture/inventory-dashboard" element={<FurnitureDashboard />} />
            <Route path="/furniture/categories" element={<FurnitureCategories />} />
            <Route path="/furniture/categories/:id" element={<FurnitureCategoryInventory />} />
            <Route path="/furniture/departments" element={<FurnitureDepartments />} />
            <Route path="/furniture/departments/:id" element={<FurnitureDepartmentInventory />} />
            <Route path="/furniture/products" element={<FurnitureProducts />} />
            <Route path="/furniture/maintenances" element={<FurnitureMaintenances />} />
            <Route path="/furniture/discarded" element={<FurnitureDiscardedProducts />} />
            <Route path="/furniture/suppliers" element={<FurnitureSuppliers />} />
            <Route path="/furniture/reports" element={<FurnitureReports />} />
          </Route>

          {/* Vehicles Routes (Conductores) */}
          <Route element={<RoleGuard allowedRoles={['Conductores', 'Administrador']} />}>
            {/* Vehicles Routes */}
            <Route path="/vehicles/dashboard" element={<VehiclesDashboard />} />
            <Route path="/vehicles/catalog" element={<VehiclesCatalog />} />
            <Route path="/vehicles/drivers" element={<DriversCatalog />} />
            <Route path="/vehicles/drivers/:id" element={<DriverProfilePage />} />
            <Route path="/vehicles/trips" element={<VehicleTrips />} />
            <Route path="/vehicles/maintenances" element={<VehicleMaintenances />} />
            <Route path="/vehicles/matriculas" element={<VehicleMatriculas />} />
            <Route path="/vehicles/history" element={<TripHistory />} />
            <Route path="/vehicles/reports" element={<VehicleReports />} />
            <Route path="/vehicles/:id" element={<VehicleProfile />} />
          </Route>

          {/* Admin / Settings (Administrador) */}
          <Route element={<RoleGuard allowedRoles={['Administrador']} />}>
            <Route path="/control-panel" element={<SettingsDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
