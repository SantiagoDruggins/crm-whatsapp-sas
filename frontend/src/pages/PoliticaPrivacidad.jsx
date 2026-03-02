import { Link } from 'react-router-dom';

export default function PoliticaPrivacidad() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Política de privacidad</h1>
        <p className="text-[#8b9cad] text-sm mb-10">Última actualización: febrero 2025</p>

        <div className="prose prose-invert max-w-none space-y-6 text-[#8b9cad]">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Responsable del tratamiento</h2>
            <p>DELTHASEG Systems Group es el responsable del tratamiento de los datos personales que recopilamos a través de la plataforma de CRM y chatbot para WhatsApp (en adelante, «el Servicio»). Puedes contactarnos a través de los canales indicados en la web.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. Datos que recopilamos</h2>
            <p>Recopilamos los datos necesarios para prestar el Servicio:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-white">Datos de cuenta:</strong> nombre, correo electrónico, datos de la empresa o negocio que utiliza el Servicio.</li>
              <li><strong className="text-white">Datos de uso:</strong> conversaciones gestionadas a través del CRM, contactos y mensajes vinculados a WhatsApp cuando conectas tu número de negocio.</li>
              <li><strong className="text-white">Datos técnicos:</strong> dirección IP, tipo de navegador, registros de acceso y uso del Servicio, de forma anónima o identificada cuando sea necesario para el funcionamiento o la seguridad.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. Finalidad del tratamiento</h2>
            <p>Utilizamos tus datos para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Proporcionar, mantener y mejorar el Servicio (CRM, chatbot, integración con WhatsApp).</li>
              <li>Gestionar tu cuenta, facturación y soporte.</li>
              <li>Cumplir obligaciones legales y resolver disputas.</li>
              <li>Enviar comunicaciones sobre el Servicio (por ejemplo, cambios importantes o soporte), salvo que indiques lo contrario.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Base legal y conservación</h2>
            <p>El tratamiento se basa en la ejecución del contrato (prestación del Servicio), el consentimiento cuando lo requiera la ley, y el interés legítimo para seguridad y mejora del producto. Conservamos los datos mientras mantengas una cuenta activa y, tras la baja, durante el tiempo que exijan las leyes aplicables.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Compartir datos</h2>
            <p>No vendemos tus datos personales. Podemos compartir información con:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-white">Meta (WhatsApp):</strong> para el envío y recepción de mensajes cuando utilizas la integración con WhatsApp Cloud API, según la política de privacidad de Meta.</li>
              <li><strong className="text-white">Proveedores de servicios:</strong> hosting, correo, análisis o soporte técnico, que actúan bajo contrato y solo para los fines indicados.</li>
              <li><strong className="text-white">Autoridades:</strong> cuando la ley lo exija.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Tus derechos</h2>
            <p>Según la normativa aplicable (por ejemplo, GDPR o leyes locales), puedes solicitar acceso, rectificación, supresión, limitación del tratamiento, portabilidad u oposición. Puedes ejercer estos derechos contactando al responsable indicado arriba. También tienes derecho a presentar una reclamación ante la autoridad de protección de datos competente.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7. Seguridad y cambios</h2>
            <p>Aplicamos medidas técnicas y organizativas para proteger tus datos. Esta política puede actualizarse; la versión vigente se publicará en esta página con la fecha de «Última actualización».</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#2d3a47]">
          <Link to="/" className="text-[#00c896] hover:text-[#00e0a8] font-medium">← Volver al inicio</Link>
        </div>
      </main>

      <footer className="border-t border-[#2d3a47] py-6 px-4 mt-12">
        <div className="max-w-4xl mx-auto text-center text-[#8b9cad] text-sm">
          <p>© {new Date().getFullYear()} DELTHASEG Systems Group. Todos los derechos reservados.</p>
          <p className="mt-2">
            <Link to="/politica-de-privacidad" className="text-[#00c896] hover:underline">Política de privacidad</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
