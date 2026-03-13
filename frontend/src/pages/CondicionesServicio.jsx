import { Link } from 'react-router-dom';

export default function CondicionesServicio() {
  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      <header className="border-b border-[#2d3a47] bg-[#0f1419]/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-delthaseg.png" alt="DELTHASEG" className="h-8 w-auto object-contain" />
            <span className="font-bold text-white">DELTHASEG SYSTEMS GROUP</span>
          </Link>
          <Link to="/" className="text-[#8b9cad] hover:text-white text-sm">Volver al inicio</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Condiciones del servicio</h1>
        <p className="text-[#8b9cad] text-sm mb-10">Última actualización: febrero 2025</p>

        <div className="prose prose-invert max-w-none space-y-6 text-[#8b9cad]">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Aceptación</h2>
            <p>Al acceder o utilizar la plataforma de CRM e integración con WhatsApp Business (en adelante, «el Servicio»), aceptas estas condiciones del servicio. Si no estás de acuerdo, no utilices el Servicio.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. Descripción del Servicio</h2>
            <p>El Servicio permite gestionar contactos, conversaciones, pedidos y agenda mediante un panel de control conectado a WhatsApp Cloud API. La conexión con Facebook/WhatsApp se realiza mediante el flujo de autorización oficial de Meta (OAuth). El proveedor del Servicio actúa como intermediario técnico y no se hace responsable del uso que el usuario haga de las APIs de Meta ni del cumplimiento de las políticas de WhatsApp Business.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. Uso aceptable</h2>
            <p>Te comprometes a utilizar el Servicio de forma lícita y de acuerdo con:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Las políticas y condiciones de Meta, WhatsApp y Facebook aplicables a tu cuenta de negocio.</li>
              <li>La legislación vigente en tu jurisdicción (protección de datos, comunicaciones comerciales, spam, etc.).</li>
              <li>Un uso que no perjudique a terceros ni al propio Servicio (por ejemplo, sin abusar de la API, sin enviar mensajes no solicitados masivos o prohibidos).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Cuenta y responsabilidad</h2>
            <p>Eres responsable de mantener la confidencialidad de tu cuenta y de toda la actividad que se realice bajo ella. La conexión de tu número de WhatsApp Business mediante «Conectar con Facebook» implica que autorizas al Servicio a usar los permisos concedidos exclusivamente para ofrecerte las funcionalidades del CRM (envío y recepción de mensajes, gestión de contactos, etc.).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Disponibilidad y modificaciones</h2>
            <p>El Servicio se ofrece «tal cual». Nos reservamos el derecho de modificar, suspender o interrumpir total o parcialmente el Servicio o estas condiciones, con un aviso razonable cuando sea posible. El uso continuado del Servicio tras cambios constituye la aceptación de los mismos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Limitación de responsabilidad</h2>
            <p>En la máxima medida permitida por la ley, el proveedor del Servicio no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso del Servicio, ni por interrupciones, pérdida de datos o dependencia de integraciones con terceros (incluidos Meta y WhatsApp).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7. Contacto</h2>
            <p>Para dudas sobre estas condiciones o el Servicio, puedes contactarnos a través de los canales indicados en la web o en el panel de la aplicación.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#2d3a47]">
          <Link to="/" className="text-[#00c896] hover:text-[#00e0a8] font-medium">← Volver al inicio</Link>
        </div>
      </main>

      <footer className="border-t border-[#2d3a47] py-6 px-4 mt-12">
        <div className="max-w-4xl mx-auto text-center text-[#8b9cad] text-sm">
          <p>© {new Date().getFullYear()} DELTHASEG Systems Group. Todos los derechos reservados.</p>
          <p className="mt-2 flex justify-center gap-4">
            <Link to="/politica-de-privacidad" className="text-[#00c896] hover:underline">Política de privacidad</Link>
            <span>·</span>
            <Link to="/terminos" className="text-[#00c896] hover:underline">Condiciones del servicio</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
