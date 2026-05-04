import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import PoliticaPrivacidad from './pages/PoliticaPrivacidad';
import CondicionesServicio from './pages/CondicionesServicio';
import Registro from './pages/Registro';
import Login from './pages/Login';
import OlvidePassword from './pages/OlvidePassword';
import ResetPassword from './pages/ResetPassword';
import LayoutCliente from './components/LayoutCliente';
import LayoutSuperAdmin from './components/LayoutSuperAdmin';
import CrmHomeRedirect from './pages/cliente/CrmHomeRedirect';
import Equipo from './pages/cliente/Equipo';
import Contactos from './pages/cliente/Contactos';
import ErrorBoundary from './components/ErrorBoundary';
import Conversaciones from './pages/cliente/Conversaciones';
import ConversacionDetalle from './pages/cliente/ConversacionDetalle';
import WhatsApp from './pages/cliente/WhatsApp';
import BotIA from './pages/cliente/BotIA';
import Catalogo from './pages/cliente/Catalogo';
import Pagos from './pages/cliente/Pagos';
import Integraciones from './pages/cliente/Integraciones';
import Pedidos from './pages/cliente/Pedidos';
import AuditoriaIA from './pages/cliente/AuditoriaIA';
import Agenda from './pages/cliente/Agenda';
import PideAgente from './pages/cliente/PideAgente';
import Automatizaciones from './pages/cliente/Automatizaciones';
import Ayuda from './pages/cliente/Ayuda';
import Branding from './pages/cliente/Branding';
import Sugerencias from './pages/cliente/Sugerencias';
import MiCuenta from './pages/cliente/MiCuenta';
import Referidos from './pages/cliente/Referidos';
import AdminMetricas from './pages/admin/AdminMetricas';
import AdminEmpresas from './pages/admin/AdminEmpresas';
import AdminEmpresaDetalle from './pages/admin/AdminEmpresaDetalle';
import AdminPagos from './pages/admin/AdminPagos';
import AdminFeedback from './pages/admin/AdminFeedback';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/politica-de-privacidad" element={<PoliticaPrivacidad />} />
      <Route path="/terminos" element={<CondicionesServicio />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/login" element={<Login />} />
      <Route path="/olvide-password" element={<OlvidePassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<LayoutCliente />}>
        <Route index element={<CrmHomeRedirect />} />
        <Route path="contactos" element={<ErrorBoundary><Contactos /></ErrorBoundary>} />
        <Route path="conversaciones" element={<Conversaciones />} />
        <Route path="conversaciones/:id" element={<ErrorBoundary><ConversacionDetalle /></ErrorBoundary>} />
        <Route path="pide-agente" element={<PideAgente />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="ia" element={<BotIA />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="equipo" element={<Equipo />} />
        <Route path="integraciones" element={<Integraciones />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="auditoria-ia" element={<AuditoriaIA />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="automatizaciones" element={<Automatizaciones />} />
        <Route path="ayuda" element={<Ayuda />} />
        <Route path="branding" element={<Branding />} />
        <Route path="sugerencias" element={<Sugerencias />} />
        <Route path="mi-cuenta" element={<MiCuenta />} />
        <Route path="referidos" element={<Referidos />} />
      </Route>
      <Route path="/admin" element={<LayoutSuperAdmin />}>
        <Route index element={<AdminMetricas />} />
        <Route path="empresas" element={<AdminEmpresas />} />
        <Route path="empresas/:id" element={<AdminEmpresaDetalle />} />
        <Route path="pagos" element={<AdminPagos />} />
        <Route path="feedback" element={<AdminFeedback />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
