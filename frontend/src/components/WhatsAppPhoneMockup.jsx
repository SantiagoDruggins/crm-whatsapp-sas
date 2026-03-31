import { useState, useEffect, useLayoutEffect, useRef } from 'react';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCRIPT = [
  { role: 'typing', ms: 1100 },
  { role: 'user', text: '¿Tienen envío a Medellín y cuánto demora?' },
  { role: 'typing', ms: 1400 },
  { role: 'bot', text: '¡Hola! Sí, enviamos a Medellín en 2–3 días hábiles. ¿Te paso el catálogo y precios?' },
  { role: 'typing', ms: 900 },
  { role: 'user', text: 'Sí, mándamelo por favor' },
  { role: 'typing', ms: 1500 },
  {
    role: 'bot',
    text: 'Listo: tenemos catálogo A, B y C. El más pedido es el kit Básico desde $129.000 COP.',
  },
  { role: 'typing', ms: 1000 },
  { role: 'user', text: '¿Puedo pagar contra entrega?' },
  { role: 'typing', ms: 1600 },
  {
    role: 'bot',
    text: 'En Medellín sí aceptamos contra entrega. También transferencia, Nequi o tarjeta en línea.',
  },
  { role: 'typing', ms: 1100 },
  { role: 'user', text: 'Genial, lo pido entonces 👍' },
  { role: 'typing', ms: 1400 },
  {
    role: 'bot',
    text: '¡Perfecto! Te dejo el pedido en borrador. ¿Confirmamos dirección y horario de entrega?',
  },
  { role: 'typing', ms: 1200 },
  {
    role: 'bot',
    text: '🤖 Respuestas con IA · escribe “agente” si quieres hablar con una persona.',
  },
];

/**
 * Mockup animado: chat de WhatsApp o vista CRM (pipeline).
 */
export default function WhatsAppPhoneMockup({ className = '', variant = 'chat' }) {
  const isCrm = variant === 'crm';
  const [visible, setVisible] = useState([]);
  const [typing, setTyping] = useState(false);
  const [crmStep, setCrmStep] = useState(0);
  /** Solo el área del chat (overflow); NUNCA scrollIntoView: sube toda la landing. */
  const chatScrollRef = useRef(null);
  const runId = useRef(0);
  const msgId = useRef(0);

  useEffect(() => {
    if (isCrm) return undefined;
    let cancelled = false;

    async function playLoop() {
      const id = ++runId.current;
      while (!cancelled && runId.current === id) {
        msgId.current = 0;
        setVisible([]);
        setTyping(false);
        await sleep(600);

        for (let i = 0; i < SCRIPT.length; i++) {
          if (cancelled || runId.current !== id) return;
          const step = SCRIPT[i];
          if (step.role === 'typing') {
            setTyping(true);
            await sleep(step.ms);
            setTyping(false);
            continue;
          }
          const key = ++msgId.current;
          setVisible((v) => [...v, { role: step.role, text: step.text, key }]);
          await sleep(380);
        }

        await sleep(4800);
      }
    }

    playLoop();
    return () => {
      cancelled = true;
      runId.current += 1;
    };
  }, [isCrm]);

  useLayoutEffect(() => {
    if (isCrm) return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visible, typing, isCrm]);

  useEffect(() => {
    if (!isCrm) return undefined;
    const timer = setInterval(() => {
      setCrmStep((s) => (s + 1) % 3);
    }, 1600);
    return () => clearInterval(timer);
  }, [isCrm]);

  return (
    <div className={`relative mx-auto w-full max-w-[300px] select-none ${className}`} aria-hidden="true">
      <div className="rounded-[2.2rem] border-[3px] border-[#2d3a47] bg-[#0a0f14] p-2 shadow-2xl shadow-black/50 ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[1.85rem] bg-[#0b141a]">
          <div className="flex h-7 items-center justify-center bg-black/40">
            <div className="h-4 w-24 rounded-full bg-black/60" />
          </div>

          {isCrm ? (
            <>
              <div className="flex items-center gap-2.5 bg-[#1b2530] px-3 py-2.5 border-b border-black/20">
                <span className="text-[#8696a0] text-lg leading-none">‹</span>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#00c896] to-[#0ea5e9] flex items-center justify-center text-base shrink-0">
                  📊
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-[#e9edef] truncate">CRM · Pipeline IA</p>
                  <p className="text-xs text-[#8696a0]">12 oportunidades activas</p>
                </div>
              </div>

              <div className="relative h-[min(56vh,440px)] min-h-[300px] overflow-hidden px-2 py-3 bg-[#0b141a]">
                <div className="grid grid-cols-3 gap-2 h-full">
                  {[
                    { title: 'Nuevo', count: 4, color: 'border-[#3a4b5c]' },
                    { title: 'En gestión', count: 5, color: 'border-[#00c896]/40' },
                    { title: 'Cierre', count: 3, color: 'border-[#0ea5e9]/40' },
                  ].map((col, idx) => (
                    <div key={col.title} className={`rounded-lg border ${col.color} bg-[#111c24] p-1.5`}>
                      <p className="text-[10px] text-[#8b9cad] mb-1">
                        {col.title} <span className="text-white">({col.count})</span>
                      </p>
                      <div className="space-y-1.5">
                        {crmStep === idx ? (
                          <div className="rounded-md border border-[#00c896]/40 bg-[#133428] p-1.5 shadow-[0_0_0_1px_rgba(0,200,150,0.15)] transition-all duration-500">
                            <p className="text-[10px] text-white font-semibold truncate">Lead WhatsApp</p>
                            <p className="text-[9px] text-[#9be8d0]">
                              {idx === 0 ? 'Nuevo contacto detectado' : idx === 1 ? 'Seguimiento automatico IA' : 'Listo para cierre'}
                            </p>
                          </div>
                        ) : null}
                        <div className="rounded-md border border-white/10 bg-[#1a2833] p-1.5 motion-safe:animate-pulse">
                          <p className="text-[10px] text-white font-medium truncate">Lead Instagram</p>
                          <p className="text-[9px] text-[#8b9cad]">Interesado en plan Pro</p>
                        </div>
                        <div className="rounded-md border border-white/10 bg-[#1a2833] p-1.5">
                          <p className="text-[10px] text-white font-medium truncate">Tienda Cali</p>
                          <p className="text-[9px] text-[#8b9cad]">Solicita integracion Shopify</p>
                        </div>
                        <div className="rounded-md border border-white/10 bg-[#1a2833] p-1.5">
                          <p className="text-[10px] text-white font-medium truncate">Botica Norte</p>
                          <p className="text-[9px] text-[#8b9cad]">Pendiente pago Wompi</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 bg-[#202c33] px-3 py-2.5 border-b border-black/20">
                <span className="text-[#8696a0] text-lg leading-none">‹</span>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#00c896] to-[#059669] flex items-center justify-center text-lg shrink-0">
                  🏪
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-[#e9edef] truncate">Tu negocio · Bot IA</p>
                  <p className="text-xs text-[#8696a0]">en línea</p>
                </div>
              </div>
              <div
                ref={chatScrollRef}
                className="relative h-[min(56vh,440px)] min-h-[300px] overflow-y-auto overflow-x-hidden px-2 py-3 space-y-2 bg-[#0b141a] wa-mock-chat-bg overscroll-contain"
              >
                {visible.map((m) =>
                  m.role === 'user' ? (
                    <div key={m.key} className="flex justify-end wa-mock-msg-in">
                      <div className="max-w-[88%] rounded-lg rounded-tr-sm bg-[#005c4b] px-2.5 py-1.5 text-[13px] leading-snug text-[#e9edef] shadow-sm">
                        {m.text}
                      </div>
                    </div>
                  ) : (
                    <div key={m.key} className="flex justify-start wa-mock-msg-in">
                      <div className="max-w-[88%] rounded-lg rounded-tl-sm bg-[#202c33] px-2.5 py-1.5 text-[13px] leading-snug text-[#e9edef] shadow-sm border border-white/5">
                        {m.text}
                      </div>
                    </div>
                  )
                )}
                {typing && (
                  <div className="flex justify-start wa-mock-msg-in">
                    <div className="rounded-lg rounded-tl-sm bg-[#202c33] px-4 py-3 border border-white/5">
                      <span className="flex gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#8696a0] animate-bounce [animation-delay:0ms]" />
                        <span className="inline-block h-2 w-2 rounded-full bg-[#8696a0] animate-bounce [animation-delay:150ms]" />
                        <span className="inline-block h-2 w-2 rounded-full bg-[#8696a0] animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 bg-[#202c33] px-2 py-2 border-t border-black/20">
            <div className="flex-1 rounded-full bg-[#2a3942] h-9 px-3 flex items-center text-xs text-[#8696a0]">Mensaje</div>
            <div className="h-9 w-9 rounded-full bg-[#00a884] flex items-center justify-center text-white text-sm">➤</div>
          </div>
        </div>
      </div>
    </div>
  );
}
