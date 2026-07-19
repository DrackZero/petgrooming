import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

// Páginas públicas / cliente
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Pets from './pages/Pets.jsx';
import Appointments from './pages/Appointments.jsx';
import Courses from './pages/Courses.jsx';
import Shop from './pages/Shop.jsx';
import Cart from './pages/Cart.jsx';
import History from './pages/History.jsx';
import PaymentResult from './pages/PaymentResult.jsx';
import Chat from './pages/Chat.jsx';

// Panel del veterinario
import VetAgenda from './pages/vet/VetAgenda.jsx';
import VetPets from './pages/vet/VetPets.jsx';
import VetSlots from './pages/vet/VetSlots.jsx';

// Panel del administrador
import Dashboard from './pages/admin/Dashboard.jsx';
import ManageProducts from './pages/admin/ManageProducts.jsx';
import ManageCourses from './pages/admin/ManageCourses.jsx';
import ManageOrders from './pages/admin/ManageOrders.jsx';
import ManageClients from './pages/admin/ManageClients.jsx';
import Reports from './pages/admin/Reports.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/payment-result" element={<PaymentResult />} />

          {/* Cualquier usuario autenticado */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute roles={['cliente', 'veterinario']}><Chat /></ProtectedRoute>} />

          {/* Cliente */}
          <Route path="/pets" element={<ProtectedRoute roles={['cliente']}><Pets /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute roles={['cliente']}><Appointments /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute roles={['cliente']}><History /></ProtectedRoute>} />

          {/* Veterinario */}
          <Route path="/vet/agenda" element={<ProtectedRoute roles={['veterinario']}><VetAgenda /></ProtectedRoute>} />
          <Route path="/vet/pets" element={<ProtectedRoute roles={['veterinario']}><VetPets /></ProtectedRoute>} />
          <Route path="/vet/slots" element={<ProtectedRoute roles={['veterinario']}><VetSlots /></ProtectedRoute>} />

          {/* Administrador */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute roles={['admin']}><ManageProducts /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute roles={['admin']}><ManageCourses /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute roles={['admin']}><ManageOrders /></ProtectedRoute>} />
          <Route path="/admin/clients" element={<ProtectedRoute roles={['admin']}><ManageClients /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
