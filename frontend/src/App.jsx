import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

// Páginas públicas / cliente
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Pets from './pages/Pets.jsx';
import Appointments from './pages/Appointments.jsx';
import Courses from './pages/Courses.jsx';
import Shop from './pages/Shop.jsx';
import Cart from './pages/Cart.jsx';
import History from './pages/History.jsx';

// Páginas de administración
import Dashboard from './pages/admin/Dashboard.jsx';
import ManageProducts from './pages/admin/ManageProducts.jsx';
import ManageCourses from './pages/admin/ManageCourses.jsx';
import ManageSlots from './pages/admin/ManageSlots.jsx';
import ManageAppointments from './pages/admin/ManageAppointments.jsx';
import ManageOrders from './pages/admin/ManageOrders.jsx';
import ManageClients from './pages/admin/ManageClients.jsx';
import Reports from './pages/admin/Reports.jsx';

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Shop />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />

          {/* Cliente (requieren sesión) */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/pets" element={<ProtectedRoute><Pets /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />

          {/* Administración (requieren rol admin) */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute adminOnly><ManageProducts /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute adminOnly><ManageCourses /></ProtectedRoute>} />
          <Route path="/admin/slots" element={<ProtectedRoute adminOnly><ManageSlots /></ProtectedRoute>} />
          <Route path="/admin/appointments" element={<ProtectedRoute adminOnly><ManageAppointments /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute adminOnly><ManageOrders /></ProtectedRoute>} />
          <Route path="/admin/clients" element={<ProtectedRoute adminOnly><ManageClients /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
