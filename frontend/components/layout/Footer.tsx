import Link from "next/link";

/**
 * El footer se renderiza en TODAS las páginas, así que cada entrada rota de acá
 * es un enlace roto sitewide. Tres salieron por eso:
 *
 * - `/help` daba 404. La única ayuda que existe es `/dashboard/help`, que es
 *   privada y está en `Disallow`. Una página pública de ayuda merece contenido
 *   propio; hasta que exista, no tener el enlace es mejor que un 404 sitewide.
 * - `/dashboard/domains` era un enlace público a una ruta `Disallow` que rebota
 *   al login a cualquier anónimo.
 * - "Explorar Activos" apuntaba a `/` mientras el navbar apuntaba a `/assets`.
 *   Dos destinos para el mismo texto de ancla, repetidos en todo el sitio.
 *
 * Al agregar una entrada acá: verificar que la ruta exista, que sea pública y
 * que no esté en `Disallow` de `robots.ts`.
 */
const footerLinks = {
  producto: [
    { href: "/assets", label: "Explorar Activos" },
    { href: "/register", label: "Publicar Activo" },
  ],
  soporte: [
    { href: "/#como-funciona", label: "Cómo Funciona" },
    { href: "/terms", label: "Términos y Condiciones" },
    { href: "/privacy", label: "Política de Privacidad" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-midnight-blue text-white">
      <div className="container-market py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DV</span>
              </div>
              <span className="font-semibold text-lg">Da Vinci Inventa</span>
            </div>
            <p className="text-sm text-white/60 max-w-xs leading-relaxed">
              Infraestructura digital para la intermediación de activos intelectuales.
              Conectamos ideas con oportunidades.
            </p>
          </div>

          {/* Producto */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
              Producto
            </h4>
            <ul className="space-y-3">
              {footerLinks.producto.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
              Soporte
            </h4>
            <ul className="space-y-3">
              {footerLinks.soporte.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Da Vinci Inventa. Todos los derechos reservados.
          </p>
          <p className="text-xs text-white/40">
            Plataforma SaaS de intermediación de licencias
          </p>
        </div>
      </div>
    </footer>
  );
}
