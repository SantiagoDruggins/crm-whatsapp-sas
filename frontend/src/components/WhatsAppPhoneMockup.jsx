import { useState, useEffect, useRef } from 'react';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCRIPT = [
  { role: 'typing', ms: 1400 },
  {
    role: 'user',
    text: '¿Tienen envío a Medellín y cuánto demora?',
  },
  { role: 'typing', ms: 1600 },
  {
    role: 'bot',
    text: '¡Hola! Sí, enviamos a Medellín en 2–3 días hábiles. ¿Te paso el catálogo y precios?',
  },
  { role: 'typing', ms: 1200 },
  {
    role: 'bot',
    text: '🤖 Respuesta automática con IA · puedes pedir agente humano cuando quieras.',
  },
];

/**
 * Mockup animado: marco de teléfono + chat estilo WhatsApp (oscuro) con secuencia en bucle.
 */
export default function WhatsAppPhoneMockup({ className = '' }) {
  const [visible, setVisible] = useState([]);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const runId = useRef(0);
  const msgId = useRef(0);

  useEffect(() => {
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
          await sleep(450);
        }

        await sleep(5200);
      }
    }

    playLoop();
    return () => {
      cancelled = true;
      runId.current += 1;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visible, typing]);

  return (
    <div className={`relative mx-auto w-full max-w-[300px] select-none ${className}`} aria-hidden="true">
      <div className="rounded-[2.2rem] border-[3px] border-[#2d3a47] bg-[#0a0f14] p-2 shadow-2xl shadow-black/50 ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[1.85rem] bg-[#0b141a]">
          <div className="flex h-7 items-center justify-center bg-black/40">
            <div className="h-4 w-24 rounded-full bg-black/60" />
          </div>

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

          <div className="relative h-[min(52vh,380px)] min-h-[280px] overflow-y-auto px-2 py-3 space-y-2 bg-[#0b141a] wa-mock-chat-bg">
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
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 bg-[#202c33] px-2 py-2 border-t border-black/20">
            <div className="flex-1 rounded-full bg-[#2a3942] h-9 px-3 flex items-center text-xs text-[#8696a0]">Mensaje</div>
            <div className="h-9 w-9 rounded-full bg-[#00a884] flex items-center justify-center text-white text-sm">➤</div>
          </div>
        </div>
      </div>
    </div>
  );
}
