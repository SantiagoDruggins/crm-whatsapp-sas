import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Registro from './pages/Registro';
import Login from './pages/Login';
import LayoutCliente from './components/LayoutCliente';
import LayoutSuperAdmin from './components/LayoutSuperAdmin';
import DashboardResumen from './pages/cliente/DashboardResumen';
import Contactos from './pages/cliente/Contactos';
import Conversaciones from './pages/cliente/Conversaciones';
import ConversacionDetalle from './pages/cliente/ConversacionDetalle';
import WhatsApp from './pages/cliente/WhatsApp';
import BotIA from './pages/cliente/BotIA';
import Catalogo from './pages/cliente/Catalogo';
import Pagos from './pages/cliente/Pagos';
import Integraciones from './pages/cliente/Integraciones';
import Pedidos from './pages/cliente/Pedidos';
import AdminMetricas from './pages/admin/AdminMetricas';
import AdminEmpresas from './pages/admin/AdminEmpresas';
import AdminPagos from './pages/admin/AdminPagos';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<LayoutCliente />}>
        <Route index element={<DashboardResumen />} />
        <Route path="contactos" element={<Contactos />} />
        <Route path="conversaciones" element={<Conversaciones />} />
        <Route path="conversaciones/:id" element={<ConversacionDetalle />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="ia" element={<BotIA />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="integraciones" element={<Integraciones />} />
        <Route path="pedidos" element={<Pedidos />} />
      </Route>
      <Route path="/admin" element={<LayoutSuperAdmin />}>
        <Route index element={<AdminMetricas />} />
        <Route path="empresas" element={<AdminEmpresas />} />
        <Route path="pagos" element={<AdminPagos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
