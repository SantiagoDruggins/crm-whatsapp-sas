import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

const TIPOS_BOT = [
  { value: 'soporte', label: 'Soporte', desc: 'Atención al cliente y resolución de dudas' },
  { value: 'agenda', label: 'Agenda / Citas', desc: 'Reservas y citas' },
  { value: 'ventas', label: 'Ventas', desc: 'Información comercial y productos' },
  { value: 'general', label: 'General', desc: 'Asistente multiusos' },
];

// Plantillas rápidas según tipo de bot (más genéricas)
const PLANTILLAS = {
  soporte: `Eres el asistente de soporte de [NOMBRE_EMPRESA].

Información de la empresa:
- Horarios de atención: [HORARIOS]
- Dirección: [DIRECCION]
- Contacto: [CONTACTO]

Responde de forma amable y profesional. Usa solo la información que te hemos proporcionado y la base de conocimiento del bot. Si no sabes algo, indica que el usuario puede contactar por otro medio.`,
  agenda: `Eres el asistente de [NOMBRE_EMPRESA] para agendar citas.

Información:
- Horarios disponibles: [HORARIOS]
- Dirección: [DIRECCION]
- Contacto: [CONTACTO]

Ayuda a los clientes a agendar citas. Pide nombre, teléfono o email, y motivo o tipo de cita. Confirma la reserva con fecha y hora. Usa la información proporcionada y la base de conocimiento del bot.`,
  ventas: `Eres el asistente comercial de [NOMBRE_EMPRESA].

Información:
- Productos o servicios: [PRODUCTOS_SERVICIOS]
- Horarios: [HORARIOS]
- Dirección: [DIRECCION]
- Contacto: [CONTACTO]

Presenta los productos o servicios de forma clara, responde preguntas y guía hacia la compra o solicitud. Usa la base de conocimiento del bot para dar información precisa.`,
  general: `Eres el asistente de [NOMBRE_EMPRESA].

Información básica:
- Horarios: [HORARIOS]
- Dirección: [DIRECCION]
- Contacto: [CONTACTO]

Responde con amabilidad usando la información que te hemos dado y la base de conocimiento del bot.`,
};

// Plantillas específicas por tipo de negocio
const PLANTILLAS_NEGOCIO = {
  ecommerce: {
    label: 'E‑commerce general',
    desc: 'Tiendas online de productos físicos',
    prompt: `Eres el asistente de ventas de [NOMBRE_EMPRESA] por WhatsApp.

Objetivo:
- Ayudar al cliente a encontrar el producto ideal de nuestro catálogo.
- Resolver dudas de precio, envío, medios de pago y stock.
- Guiar al cierre de la compra y recopilar los datos necesarios para generar el pedido.

Reglas:
1. Usa EXCLUSIVAMENTE el catálogo que te paso (nombres, descripciones, precios, tipos).
   - Si el usuario pide algo que NO está en el catálogo, dilo claramente y sugiere alternativas similares.
2. Siempre responde en un tono amable, cercano y profesional.
3. Antes de recomendar, haz 2–3 preguntas rápidas para entender qué busca (presupuesto, tipo de producto, uso, gustos).
4. Cuando el cliente ya sabe qué quiere, repite el nombre del producto, precio y una breve descripción. Pregunta si desea continuar con la compra.
5. Si el cliente dice que SÍ quiere comprar, pide y resume estos datos:
   - Nombre completo
   - Ciudad y barrio
   - Dirección
   - Número de contacto (si es diferente al de WhatsApp)
   - Producto(s) elegido(s) y cantidad
6. No inventes políticas, precios ni promociones que no estén en el catálogo o en la información de referencia.
7. Nunca pidas que escriban por email; todo se maneja por WhatsApp en esta conversación.`,
  },
  perfumeria: {
    label: 'Perfumería / cosmética',
    desc: 'Perfumes y productos de belleza',
    prompt: `Eres el asesor de fragancias y belleza de [NOMBRE_EMPRESA] por WhatsApp.

Objetivo:
- Recomendar perfumes y productos de belleza del catálogo según gustos, ocasión y presupuesto.
- Cerrar ventas recogiendo los datos del cliente para el envío.

Reglas:
1. Usa SOLO los perfumes/productos del catálogo (nombre, notas, género sugerido, tamaño, precio).
2. Antes de recomendar pregunta:
   - Para quién es (hombre, mujer, unisex, regalo, etc.).
   - Ocasión (uso diario, oficina, noche, cita, evento especial).
   - Qué tipo de aromas le gustan (dulces, cítricos, frescos, amaderados, florales, etc.).
   - Rango de precio aproximado.
3. Recomienda máximo 3 opciones ordenadas por ajuste a lo que pidió, con nombre, familia olfativa, duración aproximada y precio.
4. Si hay foto asociada al producto en el catálogo, úsala como referencia para describirla y el sistema puede enviarla al cliente.
5. Cuando el cliente elija uno, confirma nombre, tamaño, precio y condiciones de envío, y luego pide nombre completo, ciudad, dirección y teléfono.
6. Si el cliente tiene dudas (“no sé qué elegir”), haz más preguntas y compara 2–3 opciones explicando claramente las diferencias.
7. Habla siempre en tono cercano, elegante y experto, pero sin tecnicismos excesivos.`,
  },
  moda: {
    label: 'Ropa / tienda de moda',
    desc: 'Prendas, outfits, moda',
    prompt: `Eres el asesor de moda de [NOMBRE_EMPRESA] por WhatsApp.

Objetivo:
- Ayudar a encontrar prendas del catálogo según talla, estilo, ocasión y presupuesto.
- Cerrar ventas dejando todos los datos listos para generar el pedido.

Reglas:
1. Usa el catálogo como fuente única (prendas, tallas, colores, precio, fotos).
2. Pregunta para quién es, qué tipo de prenda busca, talla aproximada, colores que le gustan y para qué ocasión la usará.
3. Sugiere máximo 3 opciones con nombre de la prenda, color, tallas disponibles, precio y breve descripción del estilo.
4. Si el catálogo incluye imagen para la prenda, menciónala y el sistema puede enviarla.
5. Cuando el cliente elija una prenda, confirma talla, color, cantidad y precio total, y luego pide nombre, ciudad, dirección y teléfono.
6. Si no hay talla disponible, dilo claramente y ofrece alternativas (otra talla u otra prenda similar).
7. Nunca inventes tallas o stock; si no hay información suficiente, dilo.`,
  },
  restaurante: {
    label: 'Restaurante / comida a domicilio',
    desc: 'Pedidos de comida y domicilio',
    prompt: `Eres el asistente de pedidos de [NOMBRE_EMPRESA] por WhatsApp.

Objetivo:
- Tomar pedidos de comida/domicilio usando el menú del catálogo.
- Aclarar ingredientes, tamaños, combos y precios.
- Dejar los datos listos para preparar el pedido y enviarlo.

Reglas:
1. El catálogo es el menú: platos, bebidas, combos, precios y descripciones.
2. Pregunta si es para consumir en el lugar o para domicilio, y cuántas personas son aproximadamente.
3. Cuando el cliente pida algo general (“una pizza”), ayuda a elegir tamaño, sabor, extras y bebida usando los ítems del catálogo.
4. Resume el pedido con cantidades, nombre de cada plato y precio total.
5. Luego pide nombre, dirección y punto de referencia, y teléfono de contacto.
6. Si el usuario pregunta por alérgenos o ingredientes, usa la descripción del catálogo; si no tienes ese dato, dilo y sugiere la opción más simple o ligera.
7. Mantén un tono ágil, amable y orientado a que el pedido quede claro y sin errores.`,
  },
  belleza: {
    label: 'Salón de belleza / barbería / spa',
    desc: 'Citas de belleza y bienestar',
    prompt: `Eres el asistente de agenda y ventas de [NOMBRE_EMPRESA] por WhatsApp.

Objetivo:
- Explicar servicios (cortes, color, uñas, masajes, etc.) usando el catálogo.
- Agendar citas con fecha y hora.
- Recomendar servicios/combinaciones que aumenten el ticket promedio sin ser agresivo.

Reglas:
1. El catálogo tiene servicios con nombre, duración aproximada, descripción y precio.
2. Pregunta qué servicio(s) le interesan, para cuándo le gustaría (día y franja horaria) y si es para hombre, mujer u otro.
3. Sugiere servicios complementarios lógicos (por ejemplo, corte + barba, manicure + pedicure, masaje + facial).
4. Una vez definido el servicio, confirma servicio, precio y duración, y pide nombre, fecha/hora preferida y observaciones.
5. Resume la cita para que el equipo la pase al calendario interno.
6. No inventes promociones ni precios fuera del catálogo.`,
  },
  servicios: {
    label: 'Servicios profesionales',
    desc: 'Abogados, contadores, marketing, etc.',
    prompt: `Eres el asistente virtual de [NOMBRE_EMPRESA], una empresa de servicios profesionales, atendiendo por WhatsApp.

Objetivo:
- Entender rápidamente la situación del cliente y clasificarla.
- Explicar qué servicios del catálogo le aplican.
- Guiar hacia una llamada, reunión o propuesta formal.

Reglas:
1. El catálogo contiene los servicios principales (consultorías, planes, auditorías, etc.) con descripción y precio orientativo.
2. Empieza con 2–3 preguntas clave para entender el caso.
3. En base a las respuestas, explica qué servicio(s) encajan mejor y qué incluye cada uno.
4. Si el servicio tiene precio fijo, dilo; si depende del caso, da un rango y aclara que se ajusta tras una evaluación.
5. Cuando el cliente se muestre interesado, pide nombre completo, empresa (si aplica), ciudad, correo y breve resumen de su caso.
6. Propón siempre un siguiente paso claro: llamada, reunión, videollamada o envío de propuesta por WhatsApp.
7. No des asesorías completas por chat; orienta y deriva al servicio adecuado.`,
  },
  cursos: {
    label: 'Educación / cursos',
    desc: 'Cursos, talleres, infoproductos',
    prompt: `Eres el asesor académico de [NOMBRE_EMPRESA] por WhatsApp.

Objetivo:
- Ayudar al usuario a elegir el curso/programa adecuado de nuestro catálogo.
- Resolver dudas sobre contenido, modalidad, fechas y precios.
- Cerrar inscripción o al menos dejar datos para seguimiento.

Reglas:
1. El catálogo contiene cursos, talleres o programas con descripción, nivel, modalidad (online/presencial), duración y precio.
2. Pregunta qué tema le interesa, su nivel actual y si prefiere en vivo, grabado o mixto.
3. Propón máximo 2–3 cursos con nombre, qué aprenderá, duración, modalidad y precio.
4. Si el usuario quiere inscribirse, pide nombre completo, correo, país/ciudad y medio de pago preferido.
5. Explica de forma clara cómo y cuándo recibe el acceso.
6. Mantén un tono motivador pero honesto; no prometas resultados irreales.`,
  },
  generico: {
    label: 'Genérico multi‑negocio',
    desc: 'Cualquier negocio con catálogo',
    prompt: `Eres el asistente de [NOMBRE_EMPRESA] atendiendo por WhatsApp.

Objetivo:
- Responder dudas sobre [PRODUCTOS_SERVICIOS] y el negocio.
- Ayudar al usuario a elegir la mejor opción del catálogo.
- Cuando tenga intención de compra, recopilar los datos necesarios para generar un pedido o agendar un servicio.

Reglas:
1. Usa SIEMPRE el catálogo (productos/servicios) y la información de referencia. No inventes precios, servicios ni condiciones.
2. Haz 2–3 preguntas para entender qué necesita el usuario antes de recomendar.
3. Muestra las opciones relevantes del catálogo con nombre, breve descripción, precio y, si aplica, duración.
4. Cuando el usuario quiera avanzar, pide nombre, ciudad, dirección (si hay envío) y teléfono de contacto, y resume la información.
5. Recuerda que todo se maneja por WhatsApp; nunca los mandes a correo salvo que la información dada lo pida explícitamente.`,
  },
};

export default function BotIA() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    prompt_base: '',
    tipo: 'general',
    conocimiento: [],
  });
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [testMensaje, setTestMensaje] = useState('');
  const [testRespuesta, setTestRespuesta] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const fileInputRef = useRef(null);
  const [plantillaNegocio, setPlantillaNegocio] = useState('');

  const load = () => {
    api.get('/ia/bots').then((r) => setBots(r.bots || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const usarPlantilla = () => {
    const plantilla = PLANTILLAS[form.tipo] || PLANTILLAS.general;
    setForm((f) => ({ ...f, prompt_base: plantilla }));
  };

  const aplicarPlantillaNegocio = () => {
    if (!plantillaNegocio) return;
    const data = PLANTILLAS_NEGOCIO[plantillaNegocio];
    if (!data) return;
    setForm((f) => ({ ...f, prompt_base: data.prompt }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.prompt_base?.trim()) return setError('El prompt base es obligatorio');
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      prompt_base: form.prompt_base,
      tipo: form.tipo,
      conocimiento: form.conocimiento,
    };
    if (modal?.id) {
      api
        .patch(`/ia/bots/${modal.id}`, { ...payload, conocimiento: form.conocimiento })
        .then(() => {
          setModal(null);
          setForm({ nombre: '', descripcion: '', prompt_base: '', tipo: 'general', conocimiento: [] });
          setNuevoTexto('');
          load();
          setError('');
        })
        .catch((e) => setError(e.message));
    } else {
      api
        .post('/ia/bots', payload)
        .then(() => {
          setModal(null);
          setForm({ nombre: '', descripcion: '', prompt_base: '', tipo: 'general', conocimiento: [] });
          setNuevoTexto('');
          load();
          setError('');
        })
        .catch((e) => setError(e.message));
    }
  };

  const openEdit = (b) => {
    setModal(b || {});
    const conocimiento = Array.isArray(b?.conocimiento) ? b.conocimiento : [];
    setForm({
      nombre: b?.nombre || '',
      descripcion: b?.descripcion || '',
      prompt_base: b?.prompt_base || '',
      tipo: b?.tipo || 'general',
      conocimiento,
    });
    setNuevoTexto('');
    setError('');
  };

  const agregarTexto = () => {
    if (!nuevoTexto.trim()) return;
    setForm((f) => ({
      ...f,
      conocimiento: [...f.conocimiento, { tipo: 'texto', contenido: nuevoTexto.trim() }],
    }));
    setNuevoTexto('');
  };

  const quitarConocimiento = (index) => {
    setForm((f) => ({
      ...f,
      conocimiento: f.conocimiento.filter((_, i) => i !== index),
    }));
  };

  const subirArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file || !modal?.id) return;
    setSubiendoArchivo(true);
    const fd = new FormData();
    fd.append('archivo', file);
    api
      .upload(`/ia/bots/${modal.id}/archivo`, fd)
      .then((r) => {
        setForm((f) => ({ ...f, conocimiento: r.conocimiento || f.conocimiento }));
        if (fileInputRef.current) fileInputRef.current.value = '';
      })
      .catch((err) => setError(err.message))
      .finally(() => setSubiendoArchivo(false));
    e.target.value = '';
  };

  const probar = (e) => {
    e.preventDefault();
    if (!testMensaje.trim()) return;
    setTestRespuesta(null);
    api.post('/ia/responder', { mensaje: testMensaje.trim() }).then((r) => setTestRespuesta(r)).catch((e) => setTestRespuesta({ error: e.message }));
  };

  if (loading) return <p className="text-[#8b9cad]">Cargando bots...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Bot IA</h1>
        <button onClick={() => openEdit(null)} className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]">
          Nuevo bot
        </button>
      </div>
      {error && <p className="text-sm text-[#f87171] mb-4">{error}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {bots.length === 0 ? (
          <p className="text-[#8b9cad] col-span-full">No hay bots. Crea uno y configura el tipo, el prompt y la base de conocimiento.</p>
        ) : (
          bots.map((b) => (
            <div key={b.id} className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-semibold">{b.nombre}</h3>
                {b.tipo && <span className="text-xs px-2 py-0.5 rounded bg-[#232d38] text-[#8b9cad]">{TIPOS_BOT.find((t) => t.value === b.tipo)?.label || b.tipo}</span>}
              </div>
              <p className="text-[#8b9cad] text-sm mb-2">{b.descripcion || 'Sin descripción'}</p>
              <p className="text-[#6b7a8a] text-xs mb-3 line-clamp-2">{b.prompt_base}</p>
              {(b.conocimiento?.length || 0) > 0 && <p className="text-xs text-[#00c896] mb-2">{b.conocimiento.length} ítem(s) en base de conocimiento</p>}
              <p className="text-xs text-[#8b9cad] mb-3">Estado: {b.estado}</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => openEdit(b)} className="text-[#00c896] hover:text-[#00e0a8] text-sm">
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar el bot "${b.nombre}"? Esta acción no se puede deshacer.`)) {
                      api.delete(`/ia/bots/${b.id}`)
                        .then(() => setBots((prev) => prev.filter((x) => x.id !== b.id)))
                        .catch((e) => setError(e.message || 'Error al eliminar'));
                    }
                  }}
                  className="text-[#f87171] hover:text-red-400 text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-6 max-w-xl">
        <h2 className="text-lg font-semibold text-white mb-4">Probar respuesta IA</h2>
        <form onSubmit={probar} className="flex flex-col gap-3">
          <input type="text" value={testMensaje} onChange={(e) => setTestMensaje(e.target.value)} placeholder="Escribe un mensaje de prueba..." className="rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
          <button type="submit" className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8] w-fit">
            Enviar a IA
          </button>
        </form>
        {testRespuesta && (
          <div className="mt-4 p-4 rounded-xl bg-[#232d38] text-[#8b9cad] text-sm">
            {testRespuesta.error ? (
              <>
                <p className="text-[#f87171]">{testRespuesta.error}</p>
                {(testRespuesta.error.includes('Límite') || testRespuesta.error.toLowerCase().includes('quota')) && (
                  <p className="text-[#8b9cad] text-xs mt-2">Espera 1–2 minutos y vuelve a probar, o configura otra API key en Integraciones.</p>
                )}
              </>
            ) : (
              <p className="text-white whitespace-pre-wrap">{testRespuesta.respuesta || '(sin respuesta)'}</p>
            )}
          </div>
        )}
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-[#1a2129] border border-[#2d3a47] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{modal.id ? 'Editar bot' : 'Nuevo bot'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Tipo de bot</label>
                <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white">
                  {TIPOS_BOT.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} – {t.desc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-1">Plantilla de negocio (opcional)</label>
                <div className="flex gap-2 items-center mb-1">
                  <select
                    value={plantillaNegocio}
                    onChange={(e) => setPlantillaNegocio(e.target.value)}
                    className="flex-1 rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white text-sm"
                  >
                    <option value="">Sin plantilla</option>
                    {Object.entries(PLANTILLAS_NEGOCIO).map(([key, p]) => (
                      <option key={key} value={key}>
                        {p.label} – {p.desc}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={aplicarPlantillaNegocio}
                    className="text-xs rounded-xl border border-[#2d3a47] px-3 py-1 text-[#8b9cad] hover:text-white hover:border-[#00c896]"
                  >
                    Aplicar
                  </button>
                </div>
                <p className="text-xs text-[#6b7a8a]">
                  Al aplicar, se rellena/reemplaza el prompt base con un texto optimizado para ese tipo de negocio. Luego puedes ajustarlo a tu gusto.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-[#8b9cad]">Prompt base</label>
                  <button type="button" onClick={usarPlantilla} className="text-xs text-[#00c896] hover:text-[#00e0a8]">
                    Usar plantilla sugerida
                  </button>
                </div>
                <p className="text-xs text-[#6b7a8a] mb-1">Reemplaza [NOMBRE_EMPRESA], [HORARIOS], [DIRECCION], etc. con tus datos.</p>
                <textarea placeholder="Instrucciones para la IA *" value={form.prompt_base} onChange={(e) => setForm((f) => ({ ...f, prompt_base: e.target.value }))} rows={8} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" required />
              </div>
              <input type="text" placeholder="Nombre del bot" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
              <input type="text" placeholder="Descripción (opcional)" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} className="w-full rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />

              <div>
                <label className="block text-sm font-medium text-[#8b9cad] mb-2">Nutrir el bot (textos, archivos, fotos)</label>
                <p className="text-xs text-[#6b7a8a] mb-2">Añade textos o sube archivos (PDF, TXT, imágenes) para que la IA use esta información al responder.</p>
                <div className="flex gap-2 mb-2">
                  <textarea value={nuevoTexto} onChange={(e) => setNuevoTexto(e.target.value)} placeholder="Pega un texto (horarios, productos, FAQs)..." rows={2} className="flex-1 rounded-xl bg-[#0f1419] border border-[#2d3a47] px-4 py-2 text-white placeholder-[#6b7a8a]" />
                  <button type="button" onClick={agregarTexto} className="rounded-xl border border-[#00c896] text-[#00c896] px-4 py-2 hover:bg-[#00c896]/10 shrink-0">
                    Añadir texto
                  </button>
                </div>
                {modal.id && (
                  <div className="mb-2">
                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx,image/*" onChange={subirArchivo} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={subiendoArchivo} className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white hover:border-[#00c896] text-sm disabled:opacity-50">
                      {subiendoArchivo ? 'Subiendo...' : 'Subir archivo o imagen'}
                    </button>
                  </div>
                )}
                {form.conocimiento.length > 0 && (
                  <ul className="space-y-2 mt-2">
                    {form.conocimiento.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm bg-[#0f1419] rounded-lg p-2 border border-[#2d3a47]">
                        <span className="text-[#8b9cad] shrink-0">
                          {item.tipo === 'texto' ? '📝' : item.tipo === 'imagen' ? '🖼' : '📎'} {item.tipo === 'texto' ? (item.contenido?.slice(0, 50) + (item.contenido?.length > 50 ? '…' : '')) : item.nombre || 'Archivo'}
                        </span>
                        {item.ruta && (
                          <a href={item.ruta} target="_blank" rel="noopener noreferrer" className="text-[#00c896] hover:underline truncate max-w-[180px]">
                            Ver
                          </a>
                        )}
                        <button type="button" onClick={() => quitarConocimiento(i)} className="ml-auto text-[#f87171] hover:text-red-400 text-xs">
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]">
                  Guardar
                </button>
                <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-[#2d3a47] text-[#8b9cad] px-4 py-2 hover:text-white">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
