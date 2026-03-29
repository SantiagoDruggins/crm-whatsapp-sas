import { useEffect, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export function tourStorageKey(usuarioId) {
  return `crm_panel_demo_tour_v1_${usuarioId || 'anon'}`;
}

/** Dispara el tour de nuevo (p. ej. desde Ayuda). */
export function restartPanelDemoTour() {
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (u?.id) localStorage.removeItem(tourStorageKey(u.id));
  } catch {
    localStorage.removeItem(tourStorageKey('anon'));
  }
  window.dispatchEvent(new CustomEvent('crm-panel-demo-tour-restart'));
}

function buildSteps() {
  return [
    {
      element: document.body,
      popover: {
        title: 'Bienvenido a tu demo',
        description:
          'En unos pasos te mostramos dónde está lo esencial: conversaciones de WhatsApp, canal, avisos y tu plan. Puedes cerrar con la X cuando quieras.',
        side: 'over',
        align: 'center',
      },
    },
    {
      element: '#tour-sidebar',
      popover: {
        title: 'Menú principal',
        description:
          'A la izquierda tienes todas las secciones del CRM: contactos, conversaciones, WhatsApp, bot IA, catálogo y más.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-panel-tour="conversaciones"]',
      popover: {
        title: 'Conversaciones',
        description:
          'Aquí ves todos los chats de WhatsApp. Entra a uno para responder como asesor y ver el historial.',
        side: 'right',
        align: 'center',
      },
    },
    {
      element: '[data-panel-tour="whatsapp"]',
      popover: {
        title: 'WhatsApp y bot',
        description:
          'Conecta tu número con Cloud API y configura el Bot IA para que atienda automáticamente cuando quieras.',
        side: 'right',
        align: 'center',
      },
    },
    {
      element: '#tour-bell-btn',
      popover: {
        title: 'Avisos',
        description:
          'La campanita te muestra mensajes recientes y alertas para no perderte nada importante.',
        side: 'left',
        align: 'center',
      },
    },
    {
      element: '#tour-main-area',
      popover: {
        title: 'Área de trabajo',
        description:
          'El contenido de cada sección aparece aquí. En Pagos renuevas o subes comprobante; en Ayuda tienes más documentación.',
        side: 'bottom',
        align: 'center',
      },
    },
  ];
}

/**
 * Tour estilo Wompi: pasos con Atrás / Siguiente, solo en cuentas demo y una vez por usuario (localStorage).
 */
export default function PanelDemoTour({ empresa, usuario }) {
  const runTour = useCallback(() => {
    const uid = usuario?.id;
    if (!uid) return;
    if (empresa?.estado !== 'demo_activa') return;
    if (localStorage.getItem(tourStorageKey(uid)) === '1') return;

    const missing = ['#tour-sidebar', '[data-panel-tour="conversaciones"]', '[data-panel-tour="whatsapp"]', '#tour-bell-btn', '#tour-main-area'].some(
      (sel) => !document.querySelector(sel)
    );
    if (missing) return;

    const d = driver({
      showProgress: true,
      progressText: 'Paso {{current}} de {{total}}',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Atrás',
      doneBtnText: 'Listo',
      popoverClass: 'crm-panel-demo-tour',
      overlayColor: '#0a0e12',
      overlayOpacity: 0.88,
      smoothScroll: true,
      allowClose: true,
      stageRadius: 10,
      onDestroyed: () => {
        localStorage.setItem(tourStorageKey(uid), '1');
      },
      steps: buildSteps(),
    });
    d.drive();
  }, [empresa?.estado, usuario?.id]);

  useEffect(() => {
    const onRestart = () => {
      setTimeout(() => runTour(), 400);
    };
    window.addEventListener('crm-panel-demo-tour-restart', onRestart);
    return () => window.removeEventListener('crm-panel-demo-tour-restart', onRestart);
  }, [runTour]);

  useEffect(() => {
    if (!usuario?.id || empresa?.estado !== 'demo_activa') return;
    if (localStorage.getItem(tourStorageKey(usuario.id)) === '1') return;
    const t = setTimeout(() => runTour(), 850);
    return () => clearTimeout(t);
  }, [empresa?.estado, usuario?.id, runTour]);

  return null;
}
