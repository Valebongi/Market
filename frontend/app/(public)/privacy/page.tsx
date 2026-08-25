import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://vinciinventa.com";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de privacidad y tratamiento de datos personales de Da Vinci Inventa.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: "Política de Privacidad | Da Vinci Inventa",
    description: "Política de privacidad y tratamiento de datos personales de Da Vinci Inventa.",
    url: `${SITE_URL}/privacy`,
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-electric-blue hover:underline mb-6 block">
            ← Volver al inicio
          </Link>
          <h1 className="text-4xl font-bold text-carbon-gray dark:text-gray-100">
            Política de Privacidad
          </h1>
          <p className="text-slate-gray dark:text-gray-400 mt-3">
            Última actualización: marzo 2026
          </p>
        </div>

        <div className="space-y-8 text-carbon-gray dark:text-gray-200">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Información que recopilamos</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed mb-3">
              Recopilamos la siguiente información cuando utilizas Da Vinci Inventa:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-gray dark:text-gray-400">
              <li><strong className="text-carbon-gray dark:text-gray-200">Información de cuenta:</strong> nombre, correo electrónico, contraseña cifrada.</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Información de perfil:</strong> foto de perfil, descripción, enlaces a redes sociales (LinkedIn, etc.).</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Datos de uso:</strong> páginas visitadas, activos vistos, solicitudes realizadas.</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Datos de transacciones:</strong> activos publicados, solicitudes de licencia, mensajes.</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Datos técnicos:</strong> dirección IP, tipo de navegador, dispositivo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Cómo usamos tu información</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-gray dark:text-gray-400">
              <li>Proveer y mejorar los servicios de la Plataforma.</li>
              <li>Facilitar transacciones y comunicación entre usuarios.</li>
              <li>Enviar notificaciones relevantes sobre tu actividad.</li>
              <li>Prevenir fraude y garantizar la seguridad de la Plataforma.</li>
              <li>Cumplir con obligaciones legales.</li>
              <li>Mejorar la experiencia de usuario mediante análisis de uso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Compartición de datos</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed mb-3">
              No vendemos tu información personal. Podemos compartir datos con:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-gray dark:text-gray-400">
              <li><strong className="text-carbon-gray dark:text-gray-200">Otros usuarios:</strong> tu nombre y perfil público son visibles para facilitar transacciones.</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Proveedores de servicio:</strong> empresas que nos ayudan a operar la Plataforma (hosting, pagos, análisis).</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Autoridades:</strong> cuando sea requerido por ley o para proteger derechos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cookies y tecnologías similares</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Utilizamos cookies para mantener tu sesión activa, recordar preferencias (como el idioma) y analizar el uso de la Plataforma. Podés gestionar las cookies desde la configuración de tu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Seguridad de los datos</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Implementamos medidas técnicas y organizativas para proteger tu información, incluyendo cifrado de contraseñas, conexiones HTTPS y acceso restringido a datos sensibles. Sin embargo, ningún sistema es completamente seguro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Tus derechos</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed mb-3">
              Tenés derecho a:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-gray dark:text-gray-400">
              <li><strong className="text-carbon-gray dark:text-gray-200">Acceso:</strong> solicitar una copia de tus datos personales.</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Rectificación:</strong> corregir datos inexactos desde tu perfil.</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Eliminación:</strong> solicitar la eliminación de tu cuenta y datos.</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Portabilidad:</strong> exportar tus datos en formato legible.</li>
              <li><strong className="text-carbon-gray dark:text-gray-200">Oposición:</strong> oponerte al procesamiento de tus datos para fines de marketing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Retención de datos</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Conservamos tus datos mientras tu cuenta esté activa. Si eliminás tu cuenta, tus datos personales serán eliminados dentro de los 30 días, salvo que debamos retenerlos por obligaciones legales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Transferencias internacionales</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Tus datos pueden ser procesados en servidores ubicados fuera de Argentina. En tales casos, garantizamos que se apliquen salvaguardas adecuadas conforme a la normativa aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cambios en esta política</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Podemos actualizar esta política periódicamente. Te notificaremos cambios significativos por correo electrónico o mediante un aviso visible en la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contacto</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Para ejercer tus derechos o consultas sobre privacidad, contactanos en{" "}
              <a href="mailto:privacidad@vinciinventa.com" className="text-electric-blue hover:underline">
                privacidad@vinciinventa.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-fog-gray flex gap-4 text-sm">
          <Link href="/terms" className="text-electric-blue hover:underline">Términos y Condiciones</Link>
          <Link href="/" className="text-slate-gray hover:text-carbon-gray">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
