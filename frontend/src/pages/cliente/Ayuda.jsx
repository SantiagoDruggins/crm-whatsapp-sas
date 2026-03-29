import { Link } from 'react-router-dom';

export default function Ayuda() {
  return (
    <div className="space-y-6 text-sm text-[#e9edef]">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-white mb-1">Centro de ayuda</h1>
        <p className="text-[#8b9cad]">
          Aquí tienes respuestas sencillas (sin palabras técnicas) sobre cómo usar tu CRM con WhatsApp e IA.
        </p>
      </header>

      <section className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">1. Empezar con la plataforma</h2>
        <details className="mb-2">
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Qué hace este sistema por mí?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Te ayuda a atender clientes por WhatsApp, guardar sus datos, ver su historial y no olvidar ninguna cita ni
            pedido. Es como tener un asistente que organiza tus conversaciones.
          </p>
        </details>
        <details>
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Qué es un contacto?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Es cada persona que te escribe. El sistema los crea solo cuando llega un mensaje nuevo y los puedes ver en
            el menú <strong>Contactos</strong>.
          </p>
        </details>
      </section>

      <section className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">2. WhatsApp y el bot</h2>
        <details className="mb-2">
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Cuándo responde el bot solo?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Cuando tu número de WhatsApp está conectado en <strong>WhatsApp Cloud API</strong> y el bot IA está
            configurado. Si todo está en verde, las personas que escriban a ese número recibirán respuesta automática.
          </p>
        </details>
        <details className="mb-2">
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Puedo responder yo desde el CRM?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Sí. En <strong>Conversaciones</strong> entras a un chat, escribes el mensaje y el sistema lo envía al
            WhatsApp del cliente y también lo guarda en el historial.
          </p>
        </details>
        <details>
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Puedo seguir usando mi WhatsApp normal?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Sí, pero si quieres que el CRM y el bot trabajen por ti, lo ideal es que uses el número conectado al
            sistema para las conversaciones importantes.
          </p>
        </details>
      </section>

      <section className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">3. IA y memoria del cliente</h2>
        <details className="mb-2">
          <summary className="cursor-pointer text-[#00c896] font-medium">¿La IA recuerda a cada cliente?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Sí. El sistema guarda el historial de mensajes, citas, etiquetas y estado del cliente. Así el bot sabe con
            quién habla y qué temas ya se tocaron.
          </p>
        </details>
        <details>
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Qué hago si la IA se equivoca?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Puedes entrar a la conversación y escribir tú mismo la respuesta correcta. El historial quedará guardado y
            podrás ajustar el mensaje del bot en la sección <strong>Bot IA</strong>.
          </p>
        </details>
      </section>

      <section className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">4. Estados, etiquetas y automatizaciones</h2>
        <details className="mb-2">
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Qué es el estado del lead?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Es en qué punto va el cliente: nuevo, contactado, interesado, con cita, comprador, perdido, etc. Te ayuda a
            saber a quién debes seguir y a quién ya cerraste.
          </p>
        </details>
        <details className="mb-2">
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Para qué sirven las etiquetas?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Para agrupar clientes por temas, por ejemplo: “Seguro de auto”, “Renovación”, “VIP”. Las ves y editas desde
            <strong> Contactos</strong> y <strong>Tags</strong>.
          </p>
        </details>
        <details>
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Qué son las automatizaciones?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Son reglas simples que se ejecutan antes de la IA. Ejemplos: si alguien escribe “hola”, mandar un mensaje
            de bienvenida; si el lead es “nuevo” y responde, marcarlo como “contactado”.
          </p>
        </details>
      </section>

      <section className="bg-[#1a2129] border border-[#2d3a47] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">5. Citas, pedidos y planes</h2>
        <details className="mb-2">
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Dónde veo mis citas?</summary>
          <p className="mt-2 text-[#8b9cad]">
            En el menú <strong>Agenda</strong> ves todas las citas de tus clientes. También aparecen las próximas citas
            dentro de cada conversación.
          </p>
        </details>
        <details className="mb-2">
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Qué es un pedido en el CRM?</summary>
          <p className="mt-2 text-[#8b9cad]">
            Es una venta registrada con el cliente, el monto y los datos de envío. Los ves en el menú
            <strong> Pedidos</strong>. Si usas Shopify, los pedidos de la tienda pueden entrar automáticamente vía integración.
          </p>
        </details>
        <details>
          <summary className="cursor-pointer text-[#00c896] font-medium">¿Qué pasa si llego al límite de mi plan?</summary>
          <p className="mt-2 text-[#8b9cad]">
            El sistema deja de crear contactos nuevos y te muestra avisos para que puedas subir de plan en la sección
            <strong> Pagos</strong>. Lo que ya tienes guardado no se pierde.
          </p>
        </details>
      </section>

      <footer className="text-xs text-[#8b9cad] pt-2">
        ¿Tienes una duda que no está aquí? Escríbela y luego podremos añadirla a este centro de ayuda.
        <span className="block mt-1">
          También puedes revisar la <Link to="/politica-de-privacidad" className="text-[#00c896] hover:underline">Política de privacidad</Link>.
        </span>
      </footer>
    </div>
  );
}

