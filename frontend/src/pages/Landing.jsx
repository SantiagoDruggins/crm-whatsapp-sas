import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import FloatingWhatsappHelp from '../components/FloatingWhatsappHelp';
import WhatsAppPhoneMockup from '../components/WhatsAppPhoneMockup';
import {
  LANDING_PLANES,
  extrasPlanPorCodigo,
  filasComparativaConCeldas,
  precioAproxPorDia,
} from '../lib/planPresentacion';

const styles = {
  section: 'py-16 md:py-24 px-4 md:px-6 max-w-6xl mx-auto',
  sectionAlt: 'py-16 md:py-24 px-4 md:px-6 bg-[#1a2129]',
  h2: 'text-2xl md:text-3xl font-bold text-white mb-4',
  h3: 'text-xl font-semibold text-white mb-2',
  p: 'text-[#8b9cad] text-lg max-w-2xl',
  cta: 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-8 py-4 hover:bg-[#00e0a8] transition-colors',
  ctaOutline:
    'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#00c896] text-[#00c896] font-semibold px-8 py-4 hover:bg-[#00c896]/10 transition-colors',
};

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function HeroTypingTitle() {
  const TEXT = 'Atiende a tus clientes 24/7 y no pierdas ninguna venta por WhatsApp';
  const [index, setIndex] = useState(1);
  const [displayed, setDisplayed] = useState(TEXT.slice(0, 1));

  useEffect(() => {
    if (index > TEXT.length) return;
    const t = setTimeout(() => {
      setDisplayed(TEXT.slice(0, index));
      setIndex((i) => i + 1);
    }, 30);
    return () => clearTimeout(t);
  }, [index]);

  const finished = index > TEXT.length;

  return (
    <h1
      id="hero-heading"
      className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-white text-center lg:text-left"
    >
      <span className="relative">
        {displayed}
        <span
          className={`inline-block w-[2px] h-[1.1em] align-middle ml-1 ${
            finished ? 'bg-transparent' : 'bg-[#00c896] animate-pulse'
          }`}
        />
      </span>
    </h1>
  );
}

const FAQ_ITEMS = [
  {
    q: '¿Dónde ingreso los datos de mi tarjeta?',
    a: 'En el checkout oficial de Wompi (ventana segura). Nosotros no almacenamos el número de tarjeta en nuestros servidores.',
  },
  {
    q: '¿Puedo pagar la suscripción de forma recurrente?',
    a: 'Sí. Una vez autorizado el medio de pago con Wompi, los cobros mensuales se gestionan de forma automática según tu plan.',
  },
  {
    q: '¿Qué es Wompi?',
    a: 'Wompi es la pasarela de pagos que usamos en Colombia para procesar tarjetas y otros medios de forma segura y cumpliendo estándares del sector.',
  },
];

function FaqAccordion() {
  const [open, setOpen] = useState(0);
  return (
    <div className="max-w-2xl mx-auto space-y-2 text-left">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="rounded-xl border border-[#2d3a47] bg-[#232d38] overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-white font-medium hover:bg-[#2a3540] transition-colors"
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <span className={`text-[#00c896] text-xl shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-[#8b9cad] text-sm leading-relaxed border-t border-[#2d3a47]/80 pt-3">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Landing() {
  const [mobileNav, setMobileNav] = useState(false);
  const trackDemo = () => {
    try {
      if (typeof window !== 'undefined' && typeof window.fbq === 'function') window.fbq('trackCustom', 'ClickDemo');
    } catch {}
  };
  const scrollToDemo = () => {
    trackDemo();
    document.getElementById('cta-demo')?.scrollIntoView({ behavior: 'smooth' });
    setMobileNav(false);
  };

  const navLink = (href, label) => (
    <a
      href={href}
      className="text-[#8b9cad] hover:text-white text-sm font-medium py-2 md:py-0"
      onClick={() => setMobileNav(false)}
    >
      {label}
    </a>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[#2d3a47] bg-[#0f1419]/95 backdrop-blur" role="banner">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <img
              src="/logo-dsg.png"
              alt="DSG Chatbot - CRM con IA para WhatsApp"
              className="h-10 w-auto object-contain shrink-0"
              width="120"
              height="40"
            />
            <div className="min-w-0 hidden sm:block">
              <span className="font-bold text-xl text-white block leading-tight truncate">DELTHASEG</span>
              <span className="text-xs text-[#8b9cad] tracking-wide">SYSTEMS GROUP</span>
            </div>
          </div>

          <nav
            className="hidden md:flex flex-1 justify-center items-center gap-4 lg:gap-7 min-w-0 px-2"
            aria-label="Navegación principal"
          >
            {navLink('#problema', 'Problema')}
            {navLink('#solucion', 'Solución')}
            {navLink('#beneficios', 'Beneficios')}
            {navLink('#pagos-seguros', 'Pagos')}
            {navLink('#planes', 'Planes')}
            {navLink('#marca-blanca', 'Marca blanca')}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={scrollToDemo} className={styles.cta + ' text-sm px-5 py-2.5 hidden md:inline-flex'}>
              Crear demo gratis
            </button>
            <button
              type="button"
              className="md:hidden rounded-lg border border-[#2d3a47] p-2 text-white"
              aria-expanded={mobileNav}
              aria-label={mobileNav ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMobileNav((v) => !v)}
            >
              <span className="sr-only">Menú</span>
              {mobileNav ? '✕' : '☰'}
            </button>
          </div>
        </div>

        <nav
          className={`${
            mobileNav ? 'flex' : 'hidden'
          } md:hidden flex-col border-b border-[#2d3a47] bg-[#0f1419] px-4 py-4 gap-3 z-40`}
          aria-label="Navegación móvil"
        >
          {navLink('#problema', 'Problema')}
          {navLink('#solucion', 'Solución')}
          {navLink('#beneficios', 'Beneficios')}
          {navLink('#pagos-seguros', 'Pagos')}
          {navLink('#planes', 'Planes')}
          {navLink('#marca-blanca', 'Marca blanca')}
          <button onClick={scrollToDemo} className={styles.cta + ' text-sm w-full justify-center mt-1'}>
            Crear demo gratis
          </button>
        </nav>
      </header>

      <main id="contenido-principal">
        <section className={styles.section + ' pt-12 md:pt-20'} aria-labelledby="hero-heading">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 lg:gap-10 xl:gap-14 max-w-6xl mx-auto w-full">
            <div className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0 text-center lg:text-left flex flex-col items-center lg:items-start">
              <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-4">
                CRM con chatbot IA para WhatsApp
              </p>
              <div className="w-full max-w-3xl mx-auto lg:mx-0">
                <HeroTypingTitle />
              </div>
              <p className={styles.p + ' mb-8 mx-auto lg:mx-0'}>
                Conecta tu negocio a WhatsApp, automatiza respuestas con IA y gestiona todas las conversaciones desde un solo lugar. Prueba 3 días gratis, sin tarjeta.
              </p>
              <div id="cta-demo" className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                <Link to="/registro" onClick={trackDemo} className={styles.cta}>
                  Crear mi demo gratis (3 días)
                </Link>
                <a href="#como-funciona" className={styles.ctaOutline}>
                  Cómo funciona
                </a>
              </div>
              <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
                {[
                  { t: 'Respuesta inmediata', d: 'Atiende incluso fuera de horario.' },
                  { t: 'Sin tarjeta en demo', d: 'Empiezas hoy con 3 días gratis.' },
                  { t: 'Todo en un solo panel', d: 'Chats, contactos y pedidos ordenados.' },
                ].map((item) => (
                  <div key={item.t} className="rounded-xl border border-[#2d3a47] bg-[#1a2129]/70 px-4 py-3 text-left">
                    <p className="text-white text-sm font-semibold leading-snug">{item.t}</p>
                    <p className="text-[#8b9cad] text-xs mt-1 leading-relaxed">{item.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <Reveal className="relative flex-shrink-0 w-full max-w-[340px] mx-auto lg:mx-0 lg:max-w-[320px] flex flex-col items-center">
              <div className="absolute -top-3 -left-4 sm:-left-6 z-10 motion-safe:animate-pulse rounded-xl border border-[#2d3a47] bg-[#151d26]/95 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wide text-[#8b9cad]">Lead detectado</p>
                <p className="text-xs text-white font-semibold">Cliente listo para comprar</p>
              </div>
              <div className="absolute top-24 -right-4 sm:-right-8 z-10 motion-safe:animate-pulse rounded-xl border border-[#00c896]/30 bg-[#0f1f1b]/95 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wide text-[#89f4d7]">Auto respuesta IA</p>
                <p className="text-xs text-white">"Te comparto el catalogo ahora"</p>
              </div>

              <WhatsAppPhoneMockup className="relative z-[2] transition-transform duration-500 hover:scale-[1.02]" />
              <p className="mt-4 text-center text-xs text-[#6b7a8a] max-w-[260px] leading-relaxed">
                Ejemplo ilustrativo: el bot responde con IA en tu WhatsApp Business.
              </p>
              <div className="mt-4 w-full max-w-[280px] rounded-xl border border-[#2d3a47] bg-[#111922] px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1f7cff] via-[#6d5cff] to-[#00c896] text-white text-[10px] font-bold">
                    M
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-white font-semibold leading-tight truncate">Meta Cloud API</p>
                    <p className="text-[10px] text-[#8b9cad] leading-tight">Integracion activa</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#00c896]/20 text-[#8ff3d8] text-[10px] px-2 py-1 border border-[#00c896]/30">
                  Partner Ready
                </span>
              </div>
              <div className="mt-6 w-full max-w-[280px] rounded-2xl border border-[#2d3a47] bg-gradient-to-b from-[#0f1419] to-[#151c24] px-5 py-4 flex flex-col items-center gap-2 shadow-lg shadow-black/20 ring-1 ring-white/5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5c6b7a]">
                  Plataforma
                </span>
                <img
                  src="/logo-dsg.png"
                  alt="DELTHASEG — CRM con IA para WhatsApp"
                  className="h-11 sm:h-12 w-auto max-w-[200px] object-contain opacity-[0.98]"
                  width="200"
                  height="48"
                  loading="lazy"
                />
                <p className="text-center text-[11px] text-[#8b9cad] leading-snug">
                  <span className="text-white font-semibold">DELTHASEG</span>
                  <span className="text-[#6b7a8a]"> · Systems Group</span>
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="problema" className={styles.sectionAlt}>
          <Reveal>
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                <div>
                  <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2">Paso 1</p>
                  <h2 className={styles.h2}>¿Pierdes ventas porque no respondes a tiempo en WhatsApp?</h2>
                  <p className={styles.p + ' mb-10'}>
                    Los clientes esperan respuestas rápidas. Si no estás disponible, se van a la competencia.
                  </p>
                  <ul className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4 text-[#8b9cad]">
                    {[
                      { t: 'Horarios limitados', d: 'No puedes estar 24/7 detrás del celular.', icon: '⏰', kpi: 'Fuera de horario' },
                      { t: 'Conversaciones desordenadas', d: 'Se mezclan clientes, pedidos y dudas en un solo chat.', icon: '💬', kpi: 'Saturación de chats' },
                      { t: 'Sin historial claro', d: 'No sabes qué se le ofreció a cada cliente ni el contexto.', icon: '📉', kpi: 'Pérdida de contexto' },
                    ].map((item, i) => (
                      <li
                        key={item.t}
                        className="relative overflow-hidden bg-gradient-to-br from-[#232d38] to-[#1c2630] rounded-xl p-5 border border-[#2d3a47] transition-all duration-500 ease-out hover:border-[#00c896]/40 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(0,200,150,0.2)] motion-safe:animate-[fadeUp_700ms_ease-out_both]"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      >
                        <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#00c896] to-transparent opacity-70" aria-hidden />
                        <div className="flex items-start gap-3 pl-1">
                          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#00c896]/15 text-sm">
                            {item.icon}
                          </span>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-[#7be6c8] mb-1">{item.kpi}</p>
                            <span className="text-white font-semibold block mb-1 leading-snug">{item.t}</span>
                            <p className="text-[#9aabbb] text-sm leading-relaxed">{item.d}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative w-full max-w-[520px] mx-auto">
                  <div
                    className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-b from-[#00c896]/10 via-transparent to-transparent blur-2xl"
                    aria-hidden
                  />
                  <div className="relative rounded-[2.5rem] border border-[#2d3a47] bg-[#0f1419]/50 p-4 sm:p-6 overflow-hidden">
                    <img
                      src="/dolor-manual.png"
                      alt="Responder manualmente en WhatsApp agota y te hace perder ventas"
                      className="w-full h-auto max-h-[440px] object-contain"
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="pointer-events-none absolute top-6 left-6 right-6 flex flex-col gap-2">
                      <div className="w-fit max-w-full rounded-xl border border-[#2d3a47] bg-[#151d26]/85 px-3 py-2 backdrop-blur shadow-lg shadow-black/30">
                        <p className="text-[10px] uppercase tracking-wide text-[#8b9cad]">Respondiendo manual…</p>
                        <p className="text-xs text-white font-semibold">Se acumulan mensajes</p>
                      </div>
                      <div className="ml-auto w-fit max-w-full rounded-xl border border-[#f87171]/30 bg-[#2a1214]/70 px-3 py-2 backdrop-blur">
                        <p className="text-[10px] uppercase tracking-wide text-[#fca5a5]">Cliente esperando</p>
                        <p className="text-xs text-white">“¿Me confirmas el precio?”</p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-center text-xs text-[#6b7a8a]">
                    Sin automatización, el celular se vuelve cuello de botella.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="solucion" className={styles.section}>
          <Reveal>
            <div className="max-w-6xl mx-auto">
              <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2 text-center">Paso 2</p>
              <h2 className={styles.h2 + ' text-center'}>
                Un CRM pensado para WhatsApp con IA que responde por ti
              </h2>
              <p className={styles.p + ' mb-10 mx-auto text-center'}>
                Conectas tu número, configuras el asistente en minutos y todas las conversaciones se organizan solas. Tú decides cuándo intervenir.
              </p>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)_minmax(0,1fr)] gap-6 lg:gap-10 items-start lg:items-center">
                <div className="space-y-4 lg:justify-self-end w-full max-w-[360px]">
                  <div className="rounded-xl border border-[#2d3a47] bg-gradient-to-br from-[#1f2a36] to-[#19232d] px-4 py-3">
                    <p className="text-[#00c896] text-lg font-extrabold leading-tight">-70%</p>
                    <p className="text-[11px] text-[#9aabbb] leading-snug mt-1">menos tiempo de respuesta</p>
                  </div>
                  <ul className="space-y-4 text-[#8b9cad]">
                    <li className="flex gap-3">
                      <span className="text-[#00c896] font-bold">1.</span>
                      <span>
                        <strong className="text-white">Chatbot con IA (Gemini)</strong> que responde consultas, califica leads y puede cerrar ventas.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#00c896] font-bold">2.</span>
                      <span>
                        <strong className="text-white">CRM integrado:</strong> contactos, catálogo, pedidos, tags, notas e historial por conversación.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-w-[330px]">
                    <div className="absolute -inset-6 rounded-[2.2rem] bg-gradient-to-b from-[#00c896]/30 via-[#00c896]/10 to-transparent blur-2xl" aria-hidden />
                    <div className="relative rounded-[2rem] border border-[#2d3a47] bg-[#151e27]/70 p-3">
                      <WhatsAppPhoneMockup
                        variant="crm"
                        className="mx-auto transition-transform duration-500 hover:scale-[1.02]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 lg:justify-self-start w-full max-w-[360px]">
                  <div className="rounded-xl border border-[#2d3a47] bg-gradient-to-br from-[#1f2a36] to-[#19232d] px-4 py-3">
                    <p className="text-[#00c896] text-lg font-extrabold leading-tight">24/7</p>
                    <p className="text-[11px] text-[#9aabbb] leading-snug mt-1">atención incluso fuera de horario</p>
                  </div>
                  <ul className="space-y-4 text-[#8b9cad]">
                    <li className="flex gap-3">
                      <span className="text-[#00c896] font-bold">3.</span>
                      <span>
                        <strong className="text-white">Shopify:</strong> conecta tu tienda para que los pedidos lleguen solos al CRM (otras apps suelen enlazarse vía Shopify).
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#00c896] font-bold">4.</span>
                      <span>
                        <strong className="text-white">Aviso cuando piden agente:</strong> el sistema te avisa y puedes tomar la conversación.
                      </span>
                    </li>
                  </ul>
                  <div className="w-full bg-[#232d38] rounded-2xl border border-[#2d3a47] p-6 text-center transition-shadow hover:shadow-lg hover:shadow-[#00c896]/5">
                    <p className="text-white font-semibold mb-2">Demo 3 días gratis</p>
                    <p className="text-[#8b9cad] text-sm mb-4">Sin tarjeta. Acceso completo al CRM y al bot.</p>
                    <Link to="/registro" onClick={trackDemo} className={styles.cta}>
                      Crear mi demo
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="beneficios" className={styles.sectionAlt}>
          <Reveal>
            <div className="max-w-6xl mx-auto">
              <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2">Paso 3</p>
              <h2 className={styles.h2}>Todo lo que necesitas para vender más por WhatsApp</h2>
              <p className={styles.p + ' mb-12'}>Diseñado para equipos pequeños y medianos. Escalable a miles de empresas.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    title: 'WhatsApp Cloud API',
                    desc: 'API oficial de Meta para WhatsApp Business. Conexión profesional y escalable.',
                  },
                  { title: 'IA que entiende y responde', desc: 'Bot configurable por empresa: ventas, soporte o agenda.' },
                  {
                    title: 'CRM + Contactos + Conversaciones',
                    desc: 'Tags, notas, historial y aviso cuando piden hablar con una persona.',
                  },
                  { title: 'Catálogo y pedidos', desc: 'Productos para el bot; pedidos manuales o automáticos desde Shopify por webhook.' },
                  { title: 'Shopify', desc: 'Webhook de pedidos: activa la integración cuando uses tienda Shopify u apps conectadas.' },
                  {
                    title: 'Pagos con Wompi',
                    desc: 'Al activar tu plan, pagas en el checkout seguro de Wompi. Sin datos de tarjeta en nuestro sitio.',
                    highlight: true,
                  },
                ].map((item, i) => (
                  <div
                    key={item.title}
                    className={`rounded-xl p-5 border transition-all duration-300 hover:-translate-y-1 ${
                      item.highlight
                        ? 'bg-[#00c896]/10 border-[#00c896]/40 ring-1 ring-[#00c896]/20'
                        : 'bg-[#232d38] border-[#2d3a47] hover:border-[#00c896]/30'
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <h3 className={styles.h3}>{item.title}</h3>
                    <p className="text-[#8b9cad] text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section id="pagos-seguros" className={styles.section}>
          <Reveal>
            <div className="max-w-6xl mx-auto">
              <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2">Cobros en Colombia</p>
              <h2 className={styles.h2}>Pagos seguros con Wompi</h2>
              <p className={styles.p + ' mb-8'}>
                Cuando pasas de la demo al plan de pago, el cobro lo procesa <strong className="text-white">Wompi</strong>, pasarela de
                pagos reconocida en el país. Tú completas el pago en su ventana oficial: nosotros no pedimos ni guardamos el número
                completo de tu tarjeta en el CRM.
              </p>

              <div className="mb-10 flex flex-col sm:flex-row sm:items-center gap-6 rounded-2xl border border-[#2d3a47] bg-white px-6 py-5 md:px-8 md:py-6 shadow-lg shadow-black/20">
                <img
                  src="/Wompi_LogoPrincipal.svg"
                  alt="Wompi — pasarela de pagos"
                  className="h-11 sm:h-12 md:h-14 w-auto max-w-[min(100%,220px)] object-contain object-left shrink-0"
                  width="220"
                  height="56"
                  loading="lazy"
                  decoding="async"
                />
                <p className="text-[#1e293b] text-sm md:text-base leading-relaxed sm:border-l sm:border-slate-200 sm:pl-6">
                  Tus cobros de suscripción se procesan con la pasarela oficial. El logo y la ventana de pago son de Wompi; nosotros no
                  almacenamos los datos sensibles de la tarjeta.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <div className="rounded-2xl border border-[#2d3a47] bg-[#1a2129] p-6 md:p-8">
                  <ul className="space-y-4 text-[#c5d0dc] text-sm">
                    <li className="flex gap-3">
                      <span className="text-[#00c896] text-lg shrink-0" aria-hidden>
                        ✓
                      </span>
                      <span>
                        <strong className="text-white">Checkout oficial:</strong> se abre el widget de Wompi sobre el panel; misma
                        experiencia que en miles de comercios en línea.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#00c896] text-lg shrink-0" aria-hidden>
                        ✓
                      </span>
                      <span>
                        <strong className="text-white">Suscripción y renovación:</strong> según tu plan, los cobros recurrentes se
                        gestionan con los mismos estándares de seguridad de Wompi.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#00c896] text-lg shrink-0" aria-hidden>
                        ✓
                      </span>
                      <span>
                        <strong className="text-white">Historial en el panel:</strong> ves tus movimientos y el estado de cada
                        transacción sin depender de comprobantes manuales.
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-[#00c896]/25 bg-gradient-to-br from-[#00c896]/10 to-transparent p-6 md:p-8 flex flex-col justify-center">
                  <p className="text-white font-semibold mb-2">¿Listo para activar tu plan?</p>
                  <p className="text-[#8b9cad] text-sm mb-6">
                    Regístrate o inicia sesión, elige tu plan en <strong className="text-[#cbd5e0">Pagos</strong> y completa el pago
                    con Wompi en segundos.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/registro" onClick={trackDemo} className={styles.cta}>
                      Crear cuenta
                    </Link>
                    <Link to="/login" className={styles.ctaOutline}>
                      Ya tengo cuenta
                    </Link>
                  </div>
                </div>
              </div>
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-white mb-6">Preguntas frecuentes sobre el pago</h3>
              </div>
              <FaqAccordion />
            </div>
          </Reveal>
        </section>

        <section id="planes" className={styles.sectionAlt}>
          <Reveal>
            <div className="max-w-6xl mx-auto">
              <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2">Precios en Colombia</p>
              <h2 className={styles.h2}>Planes y precios (COP)</h2>
              <p className={styles.p + ' mb-2'}>
                La demo incluye hasta 50 contactos por 3 días. Cada plan suma cupos claros de usuarios y contactos. Al suscribirte, el
                pago lo procesamos de forma segura con <strong className="text-white">Wompi</strong> desde tu panel (sección Pagos).
              </p>
              <p className="text-[#8b9cad] text-sm mb-10">
                Tras iniciar sesión: <strong className="text-[#cbd5e0]">Pagos</strong> → elige plan → ventana de pago Wompi → listo.
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                {LANDING_PLANES.map((plan) => {
                  const ex = extrasPlanPorCodigo(plan.codigo);
                  const dia = precioAproxPorDia(plan.precio);
                  return (
                    <div
                      key={plan.codigo}
                      className={`relative flex flex-col rounded-2xl border p-6 pt-8 transition-all duration-300 hover:-translate-y-1 ${
                        ex.destacado
                          ? 'border-[#00c896] bg-[#00c896]/5 shadow-[0_0_40px_-12px_rgba(0,200,150,0.35)] hover:shadow-[0_0_48px_-8px_rgba(0,200,150,0.45)]'
                          : 'border-[#2d3a47] bg-[#232d38] hover:border-[#00c896]/40'
                      }`}
                    >
                      {ex.destacado ? (
                        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#00c896] px-3 py-1 text-xs font-bold text-[#0f1419]">
                          Más elegido
                        </span>
                      ) : ex.badge ? (
                        <span className="mb-2 inline-flex w-fit rounded-full border border-[#3d4f63] bg-[#1a2129] px-2.5 py-0.5 text-xs font-medium text-[#b8c5d6]">
                          {ex.badge}
                        </span>
                      ) : null}
                      <h3 className="text-xl font-bold text-white">{plan.nombre}</h3>
                      {ex.tagline ? <p className="mt-1 text-sm text-[#8b9cad]">{ex.tagline}</p> : null}
                      <p className="mt-4 text-2xl font-bold text-[#00c896]">
                        ${plan.precio.toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP{' '}
                        <span className="text-sm font-normal text-[#8b9cad]">/ mes</span>
                      </p>
                      {dia ? <p className="text-xs text-[#6b7a8a]">Equivale aprox. a ${dia} COP al día</p> : null}
                      <ul className="mb-6 mt-4 flex flex-1 flex-col gap-2.5 text-sm text-[#c5d0dc]">
                        {ex.features.map((f) => (
                          <li key={f} className="flex gap-2">
                            <span className="mt-0.5 shrink-0 text-[#00c896]" aria-hidden>
                              ✓
                            </span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/registro"
                        onClick={trackDemo}
                        className={
                          (plan.ctaDestacado ? styles.cta : styles.ctaOutline) + ' mt-auto w-full justify-center text-center'
                        }
                      >
                        {plan.cta}
                      </Link>
                    </div>
                  );
                })}
              </div>

              <div className="mt-14 overflow-x-auto rounded-2xl border border-[#2d3a47] bg-[#232d38]/80">
                <p className="border-b border-[#2d3a47] px-4 py-3 text-sm font-semibold text-white">Comparativa en un vistazo</p>
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#2d3a47] text-[#8b9cad]">
                      <th className="px-4 py-3 font-medium" scope="col">
                        Incluye
                      </th>
                      <th className="px-4 py-3 font-medium" scope="col">
                        Básico
                      </th>
                      <th className="px-4 py-3 font-medium text-[#00c896]" scope="col">
                        Profesional
                      </th>
                      <th className="px-4 py-3 font-medium" scope="col">
                        Empresarial
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[#e9edef]">
                    {filasComparativaConCeldas().map((row) => (
                      <tr key={row.label} className="border-b border-[#2d3a47]/80 last:border-0 hover:bg-[#1a2129]/50 transition-colors">
                        <th className="px-4 py-2.5 font-normal text-[#8b9cad]" scope="row">
                          {row.label}
                        </th>
                        <td className="px-4 py-2.5">{row.basico}</td>
                        <td className="px-4 py-2.5 font-medium text-white">{row.pro}</td>
                        <td className="px-4 py-2.5">{row.empresarial}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div id="marca-blanca" className="mt-16 pt-16 border-t border-[#2d3a47]">
                <p className="text-[#00c896] font-semibold text-sm uppercase tracking-wider mb-2">Para empresas y agencias</p>
                <h2 className={styles.h2}>¿Quieres tu propio ecosistema en marca blanca?</h2>
                <p className={styles.p + ' mb-8'}>
                  Te entregamos el CRM con WhatsApp e IA bajo tu marca: dominio, logo, colores y panel totalmente personalizado. Ideal
                  para agencias, franquicias o empresas que quieren ofrecer el servicio a sus clientes como propio.
                </p>
                <div className="rounded-2xl border-2 border-[#00c896] bg-[#00c896]/10 p-8 max-w-2xl">
                  <div className="flex flex-wrap items-baseline gap-3 mb-4">
                    <span className="text-[#00c896] font-bold text-3xl md:text-4xl">500 USD</span>
                    <span className="text-[#8b9cad]">pago único — ecosistema completo en tu marca</span>
                  </div>
                  <p className="text-[#8b9cad] text-sm mb-4">
                    El cobro se hace en <strong className="text-[#cbd5e0]">pesos colombianos (COP)</strong> por el checkout seguro de{' '}
                    <strong className="text-white">Wompi</strong>, con monto equivalente de referencia. Tras el pago aprobado activamos tu
                    licencia y coordinamos dominio y entrega.
                  </p>
                  <ul className="space-y-2 text-[#e9edef] mb-6">
                    <li className="flex items-center gap-2">
                      <span className="text-[#00c896]">✓</span> Panel y landing con tu logo, nombre y dominio
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#00c896]">✓</span> CRM + Bot IA + WhatsApp Cloud listo para usar
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#00c896]">✓</span> Soporte técnico y acompañamiento en la puesta en marcha
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#00c896]">✓</span> Todo lo necesario para que lo vendas o lo uses como tuyo
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/registro" className={styles.cta + ' text-lg px-8 py-3'}>
                      Crear cuenta y pagar con Wompi
                    </Link>
                    <Link to="/login" className={styles.ctaOutline + ' text-lg px-8 py-3'}>
                      Ya tengo cuenta
                    </Link>
                  </div>
                  <p className="text-[#8b9cad] text-sm mt-3">
                    Regístrate o inicia sesión, entra a <strong className="text-[#cbd5e0]">Pagos</strong> y elige el plan{' '}
                    <strong className="text-white">Marca blanca (pago único)</strong>. Sin comprobantes manuales: todo queda registrado en
                    tu historial Wompi.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="como-funciona" className={styles.section}>
          <Reveal>
            <div className="max-w-6xl mx-auto text-center">
              <h2 className={styles.h2 + ' mb-4'}>En 3 pasos estás vendiendo con IA</h2>
              <p className={styles.p + ' mx-auto mb-12'}>Regístrate, conecta WhatsApp y configura tu asistente. Sin instalaciones complicadas.</p>
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                {[
                  { n: '1', t: 'Crear demo gratis', d: 'Nombre de empresa, email y listo. 3 días de prueba.' },
                  { n: '2', t: 'Conectar WhatsApp', d: 'Vincula tu número de WhatsApp Business con la API de Meta al CRM.' },
                  { n: '3', t: 'Activar el bot IA', d: 'Defines el tono y las respuestas. El bot trabaja por ti.' },
                ].map((step) => (
                  <div
                    key={step.n}
                    className="rounded-xl border border-transparent p-4 transition-all hover:border-[#2d3a47] hover:bg-[#1a2129]/50"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#00c896]/20 text-[#00c896] font-bold flex items-center justify-center mx-auto mb-4">
                      {step.n}
                    </div>
                    <h3 className={styles.h3}>{step.t}</h3>
                    <p className="text-[#8b9cad] text-sm">{step.d}</p>
                  </div>
                ))}
              </div>
              <Link to="/registro" onClick={trackDemo} className={styles.cta}>
                Crear mi demo gratis (3 días)
              </Link>
            </div>
          </Reveal>
        </section>

        <section className={styles.sectionAlt}>
          <Reveal>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className={styles.h2 + ' mb-4'}>Prueba sin compromiso</h2>
              <p className={styles.p + ' mb-8'}>
                3 días de acceso completo. Sin tarjeta. Cuando quieras activar tu plan, pagas de forma segura con Wompi desde el panel.
              </p>
              <Link to="/registro" onClick={trackDemo} className={styles.cta + ' text-lg px-10 py-4'}>
                Crear demo ahora
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[#2d3a47] py-8 px-4" role="contentinfo">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 text-[#8b9cad] text-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo-delthaseg.png" alt="DELTHASEG Systems Group" className="h-8 w-auto object-contain opacity-90" width="96" height="32" />
              <span className="font-semibold text-white">DELTHASEG</span>
              <span>· SYSTEMS GROUP</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <a href="#pagos-seguros" className="hover:text-white">
                Pagos Wompi
              </a>
              <a href="#planes" className="hover:text-white">
                Planes
              </a>
              <a href="#marca-blanca" className="hover:text-white">
                Marca blanca
              </a>
              <Link to="/registro" className="hover:text-white">
                Registro
              </Link>
              <Link to="/login" className="hover:text-white">
                Iniciar sesión
              </Link>
              <Link to="/politica-de-privacidad" className="hover:text-white">
                Política de privacidad
              </Link>
            </div>
          </div>
          <p className="text-center sm:text-left text-[#6b7a8a] text-xs">
            © {new Date().getFullYear()} DELTHASEG Systems Group. Todos los derechos reservados.
          </p>
        </div>
      </footer>
      <FloatingWhatsappHelp message="Hola, tengo una consulta sobre ChatProBusiness." />
    </div>
  );
}
