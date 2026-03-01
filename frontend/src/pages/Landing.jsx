import { useState } from 'react';
import { Link } from 'react-router-dom';
import ModalNequi from '../components/ModalNequi';
import { NEQUI_PAGO, formatearNequiTelefono } from '../lib/nequi';

const styles = {
  section: 'py-16 md:py-24 px-4 md:px-6 max-w-6xl mx-auto',
  sectionAlt: 'py-16 md:py-24 px-4 md:px-6 bg-[#1a2129]',
  h2: 'text-2xl md:text-3xl font-bold text-white mb-4',
  h3: 'text-xl font-semibold text-white mb-2',
  p: 'text-[#8b9cad] text-lg max-w-2xl',
  cta: 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-8 py-4 hover:bg-[#00e0a8] transition-colors',
  ctaOutline: 'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#00c896] text-[#00c896] font-semibold px-8 py-4 hover:bg-[#00c896]/10 transition-colors',
};

export default function Landing() {
  const [modalNequi, setModalNequi] = useState(false);
  const scrollToDemo = () => {
    document.getElementById('cta-demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[#2d3a47] bg-[#0f1419]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-delthaseg.png" alt="DELTHASEG" className="h-10 w-auto object-contain" />
            <div>
              <span className="font-bold text-xl text-white block leading-tight">DELTHASEG</span>
              <span className="text-xs text-[#8b9cad] tracking-wide">SYSTEMS GROUP</span>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#problema" className="text-[#8b9cad] hover:text-white text-sm font-medium">Problema</a>
            <a href="#solucion" className="text-[#8b9cad] hover:text-white text-sm font-medium">Solución</a>
            <a href="#beneficios" className="text-[#8b9cad] hover:text-white text-sm font-medium">Beneficios</a>
            <a href="#planes" className="text-[#8b9cad] hover:text-white text-sm font-medium">Planes</a>
            <button onClick={scrollToDemo} className={styles.cta + ' text-sm'}>Crear demo gratis</button>
          </nav>
        </div>
      </header>

      <section className={styles.section + ' pt-12 md:pt-20'}>
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-6xl mx-auto">
          <div className="flex-1 max-w-3xl">
            <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-4">CRM con chatbot IA para WhatsApp</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Atiende a tus clientes 24/7 y no pierdas ninguna venta por WhatsApp
            </h1>
            <p className={styles.p + ' mb-8'}>
              Conecta tu negocio a WhatsApp, automatiza respuestas con IA y gestiona todas las conversaciones desde un solo lugar. Prueba 3 días gratis, sin tarjeta.
            </p>
            <div id="cta-demo" className="flex flex-wrap gap-4">
              <Link to="/registro" className={styles.cta}>Crear mi demo gratis (3 días)</Link>
              <a href="#como-funciona" className={styles.ctaOutline}>Cómo funciona</a>
            </div>
          </div>
          <div className="flex-shrink-0 w-full max-w-sm lg:max-w-md">
            <div className="rounded-2xl border border-[#2d3a47] bg-[#1a2129] p-6 shadow-xl shadow-black/30 ring-1 ring-white/5">
              <img src="/logo-delthaseg.png" alt="DELTHASEG Systems Group" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      </section>

      <section id="problema" className={styles.sectionAlt}>
        <div className="max-w-6xl mx-auto">
          <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2">Paso 1</p>
          <h2 className={styles.h2}>¿Pierdes ventas porque no respondes a tiempo en WhatsApp?</h2>
          <p className={styles.p + ' mb-10'}>Los clientes esperan respuestas rápidas. Si no estás disponible, se van a la competencia.</p>
          <ul className="grid md:grid-cols-3 gap-4 text-[#8b9cad]">
            <li className="bg-[#232d38] rounded-xl p-5 border border-[#2d3a47]">
              <span className="text-white font-semibold block mb-1">Horarios limitados</span>
              No puedes estar 24/7 detrás del celular.
            </li>
            <li className="bg-[#232d38] rounded-xl p-5 border border-[#2d3a47]">
              <span className="text-white font-semibold block mb-1">Conversaciones desordenadas</span>
              Se mezclan clientes, pedidos y dudas en un solo chat.
            </li>
            <li className="bg-[#232d38] rounded-xl p-5 border border-[#2d3a47]">
              <span className="text-white font-semibold block mb-1">Sin historial claro</span>
              No sabes qué se le ofreció a cada cliente ni el contexto.
            </li>
          </ul>
        </div>
      </section>

      <section id="solucion" className={styles.section}>
        <div className="max-w-6xl mx-auto">
          <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2">Paso 2</p>
          <h2 className={styles.h2}>Un CRM pensado para WhatsApp con IA que responde por ti</h2>
          <p className={styles.p + ' mb-10'}>
            Conectas tu número, configuras el asistente en minutos y todas las conversaciones se organizan solas. Tú decides cuándo intervenir.
          </p>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <ul className="space-y-4 text-[#8b9cad]">
              <li className="flex gap-3"><span className="text-[#00c896] font-bold">1.</span><span><strong className="text-white">Chatbot con IA (Gemini)</strong> que responde consultas frecuentes y califica leads.</span></li>
              <li className="flex gap-3"><span className="text-[#00c896] font-bold">2.</span><span><strong className="text-white">CRM integrado:</strong> contactos, tags, notas e historial por conversación.</span></li>
              <li className="flex gap-3"><span className="text-[#00c896] font-bold">3.</span><span><strong className="text-white">Asignación a tu equipo:</strong> pasa conversaciones a agentes cuando hace falta.</span></li>
            </ul>
            <div className="bg-[#232d38] rounded-2xl border border-[#2d3a47] p-6 text-center">
              <p className="text-white font-semibold mb-2">Demo 3 días gratis</p>
              <p className="text-[#8b9cad] text-sm mb-4">Sin tarjeta. Acceso completo al CRM y al bot.</p>
              <Link to="/registro" className={styles.cta}>Crear mi demo</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className={styles.sectionAlt}>
        <div className="max-w-6xl mx-auto">
          <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2">Paso 3</p>
          <h2 className={styles.h2}>Todo lo que necesitas para vender más por WhatsApp</h2>
          <p className={styles.p + ' mb-12'}>Diseñado para equipos pequeños y medianos. Escalable a miles de empresas.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'WhatsApp Cloud API', desc: 'API oficial de Meta para WhatsApp Business. Conexión profesional y escalable.' },
              { title: 'IA que entiende y responde', desc: 'Prompt configurable por empresa.' },
              { title: 'Contactos y conversaciones', desc: 'Tags, notas e historial completo.' },
              { title: 'Pago con Nequi', desc: 'Subes comprobante y activamos tu plan.', nequi: true },
            ].map((item, i) => (
              <div
                key={i}
                className={`bg-[#232d38] rounded-xl p-5 border border-[#2d3a47] ${item.nequi ? 'cursor-pointer hover:border-[#00c896]/50' : ''}`}
                onClick={item.nequi ? () => setModalNequi(true) : undefined}
                onKeyDown={item.nequi ? (e) => e.key === 'Enter' && setModalNequi(true) : undefined}
                role={item.nequi ? 'button' : undefined}
                tabIndex={item.nequi ? 0 : undefined}
              >
                <h3 className={styles.h3}>{item.title}</h3>
                <p className="text-[#8b9cad] text-sm">{item.desc}</p>
                {item.nequi && <p className="text-[#00c896] text-xs mt-2">Ver número y nombre →</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className={styles.sectionAlt}>
        <div className="max-w-6xl mx-auto">
          <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2">Precios en Colombia</p>
          <h2 className={styles.h2}>Planes y precios (COP)</h2>
          <p className={styles.p + ' mb-2'}>La demo incluye hasta 50 contactos por 3 días. Al pagar, cada plan tiene su límite de contactos. Pago por Nequi; subes el comprobante y activamos en 24 h.</p>
          <p className="text-white font-medium mb-2">Nequi: {formatearNequiTelefono()} — {NEQUI_PAGO.nombre}</p>
          <button type="button" onClick={() => setModalNequi(true)} className="text-[#00c896] text-sm hover:underline mb-10">Ver datos de pago Nequi</button>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { nombre: 'Básico', precio: 39900, desc: '1 usuario, hasta 500 contactos, CRM, Bot IA y WhatsApp. Ideal para emprendedores.', codigo: 'BASICO_MENSUAL' },
              { nombre: 'Profesional', precio: 89900, desc: 'Hasta 3 usuarios, 2000 contactos, Bot IA y WhatsApp. Para equipos pequeños.', codigo: 'PROFESIONAL_MENSUAL', destacado: true },
              { nombre: 'Empresarial', precio: 149900, desc: 'Usuarios y contactos ilimitados, soporte prioritario.', codigo: 'EMPRESARIAL_MENSUAL' },
            ].map((plan) => (
              <div key={plan.codigo} className={`rounded-2xl border p-6 ${plan.destacado ? 'border-[#00c896] bg-[#00c896]/5' : 'border-[#2d3a47] bg-[#232d38]'}`}>
                <h3 className="text-xl font-bold text-white mb-2">{plan.nombre}</h3>
                <p className="text-[#00c896] font-bold text-2xl mb-2">${plan.precio.toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP <span className="text-sm font-normal text-[#8b9cad]">/ mes</span></p>
                <p className="text-[#8b9cad] text-sm mb-6">{plan.desc}</p>
                <Link to="/registro" className={plan.destacado ? styles.cta + ' w-full block text-center' : styles.ctaOutline + ' w-full block text-center'}>
                  {plan.destacado ? 'Empezar ahora' : 'Crear demo'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className={styles.section}>
        <div className="max-w-6xl mx-auto text-center">
          <h2 className={styles.h2 + ' mb-4'}>En 3 pasos estás vendiendo con IA</h2>
          <p className={styles.p + ' mx-auto mb-12'}>Regístrate, conecta WhatsApp y configura tu asistente. Sin instalaciones complicadas.</p>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div>
              <div className="w-12 h-12 rounded-full bg-[#00c896]/20 text-[#00c896] font-bold flex items-center justify-center mx-auto mb-4">1</div>
              <h3 className={styles.h3}>Crear demo gratis</h3>
              <p className="text-[#8b9cad] text-sm">Nombre de empresa, email y listo. 3 días de prueba.</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-[#00c896]/20 text-[#00c896] font-bold flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className={styles.h3}>Conectar WhatsApp</h3>
              <p className="text-[#8b9cad] text-sm">Vincula tu número de WhatsApp Business con la API de Meta al CRM.</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-[#00c896]/20 text-[#00c896] font-bold flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className={styles.h3}>Activar el bot IA</h3>
              <p className="text-[#8b9cad] text-sm">Defines el tono y las respuestas. El bot trabaja por ti.</p>
            </div>
          </div>
          <Link to="/registro" className={styles.cta}>Crear mi demo gratis (3 días)</Link>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className={styles.h2 + ' mb-4'}>Prueba sin compromiso</h2>
          <p className={styles.p + ' mb-8'}>3 días de acceso completo. Sin tarjeta. Si te convence, activas tu plan con un pago por Nequi.</p>
          <Link to="/registro" className={styles.cta + ' text-lg px-10 py-4'}>Crear demo ahora</Link>
        </div>
      </section>

      <ModalNequi open={modalNequi} onClose={() => setModalNequi(false)} titulo="Pago por Nequi" />

      <footer className="border-t border-[#2d3a47] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[#8b9cad] text-sm">
          <div className="flex items-center gap-2">
            <img src="/logo-delthaseg.png" alt="" className="h-8 w-auto object-contain opacity-90" />
            <span className="font-semibold text-white">DELTHASEG</span>
            <span>· SYSTEMS GROUP</span>
          </div>
          <div className="flex gap-6">
            <a href="#planes" className="hover:text-white">Planes</a>
            <Link to="/registro" className="hover:text-white">Registro</Link>
            <Link to="/login" className="hover:text-white">Iniciar sesión</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
