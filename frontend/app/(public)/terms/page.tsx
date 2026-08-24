import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones | Da Vinci Inventa",
  description: "Términos y condiciones de uso de la plataforma Da Vinci Inventa.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm text-electric-blue hover:underline mb-6 block">
            ← Volver al inicio
          </Link>
          <h1 className="text-4xl font-bold text-carbon-gray dark:text-gray-100">
            Términos y Condiciones
          </h1>
          <p className="text-slate-gray dark:text-gray-400 mt-3">
            Última actualización: marzo 2026
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-carbon-gray dark:text-gray-200">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceptación de los términos</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Al acceder y utilizar Da Vinci Inventa (la "Plataforma"), usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguno de estos términos, no podrá utilizar nuestros servicios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descripción del servicio</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Da Vinci Inventa es un marketplace para la compra, venta y licenciamiento de activos digitales, incluyendo software, diseños, modelos de negocio, contenido y otros activos intelectuales. La Plataforma facilita la conexión entre titulares de activos y potenciales licenciatarios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Registro y cuenta de usuario</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-gray dark:text-gray-400">
              <li>Debe proporcionar información veraz y actualizada al registrarse.</li>
              <li>Es responsable de mantener la confidencialidad de sus credenciales.</li>
              <li>Debe notificar inmediatamente cualquier uso no autorizado de su cuenta.</li>
              <li>Debe ser mayor de 18 años para utilizar la Plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Publicación de activos</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed mb-3">
              Al publicar un activo en la Plataforma, usted declara y garantiza que:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-gray dark:text-gray-400">
              <li>Es el titular legítimo de los derechos sobre el activo publicado.</li>
              <li>Tiene la autoridad legal para otorgar licencias sobre dicho activo.</li>
              <li>El activo no infringe derechos de terceros, incluyendo derechos de propiedad intelectual.</li>
              <li>La descripción del activo es veraz y no induce a error.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Licenciamiento y transacciones</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Las transacciones en la Plataforma se realizan directamente entre las partes. Da Vinci Inventa actúa como intermediario y no es parte de los acuerdos de licencia. Los términos específicos de cada licencia son acordados entre el titular del activo y el licenciatario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Conducta del usuario</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed mb-3">
              Está prohibido:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-gray dark:text-gray-400">
              <li>Publicar contenido fraudulento, engañoso o que infrinja derechos de terceros.</li>
              <li>Utilizar la Plataforma para actividades ilegales.</li>
              <li>Interferir con el funcionamiento normal de la Plataforma.</li>
              <li>Realizar ingeniería inversa o intentar acceder al código fuente de la Plataforma.</li>
              <li>Crear múltiples cuentas o cuentas falsas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Comisiones y pagos</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Da Vinci Inventa puede cobrar comisiones por las transacciones realizadas en la Plataforma. Las comisiones aplicables serán informadas claramente antes de completar cada transacción. Los precios se expresan en dólares estadounidenses (USD) salvo que se indique lo contrario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitación de responsabilidad</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Da Vinci Inventa no será responsable por daños directos, indirectos, incidentales o consecuentes derivados del uso de la Plataforma. La Plataforma se provee "tal como es" sin garantías de ningún tipo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Modificaciones</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigencia al ser publicados en la Plataforma. El uso continuado de la Plataforma tras la publicación de los cambios implica la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contacto</h2>
            <p className="text-slate-gray dark:text-gray-400 leading-relaxed">
              Para consultas sobre estos términos, podés contactarnos en{" "}
              <a href="mailto:legal@davinci-inventa.com" className="text-electric-blue hover:underline">
                legal@davinci-inventa.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-fog-gray flex gap-4 text-sm">
          <Link href="/privacy" className="text-electric-blue hover:underline">Política de Privacidad</Link>
          <Link href="/" className="text-slate-gray hover:text-carbon-gray">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
