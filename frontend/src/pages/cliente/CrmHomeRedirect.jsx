import { Navigate } from 'react-router-dom';
import DashboardResumen from './DashboardResumen';
import { canAccess, firstDashboardPath } from '../../lib/crmPermissions';

function readUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario') || '{}');
  } catch {
    return {};
  }
}

export default function CrmHomeRedirect() {
  const usuario = readUsuario();
  if (canAccess(usuario, 'panel')) {
    return <DashboardResumen />;
  }
  return <Navigate to={firstDashboardPath(usuario)} replace />;
}
