import type { Metadata } from "next";
import { HelpCircle, MessageSquare, Package, Globe, Settings, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Ayuda" };

const FAQ = [
  {
    q: "¿Cómo publico un activo?",
    a: "Desde el sidebar, hacé clic en 'Mis Activos' y luego en 'Publicar Nuevo Activo'. Completá los 4 pasos: información básica, condiciones de licencia, recursos opcionales y vista previa. Al finalizar, confirmá la titularidad y publicá.",
  },
  {
    q: "¿Cómo envío una solicitud de licencia?",
    a: "Explorá el marketplace público, encontrá el activo que te interesa y hacé clic en 'Solicitar Licencia'. Completá el formulario con tu caso de uso y presupuesto. El titular recibirá una notificación.",
  },
  {
    q: "¿Cómo funciona el sistema de mensajes?",
    a: "Cada solicitud de licencia abre una conversación privada entre vos y el titular (o solicitante). Desde 'Solicitudes' podés ver y responder todos los mensajes. El titular puede aceptar o rechazar la solicitud desde la misma pantalla.",
  },
  {
    q: "¿Qué tipos de licencia existen?",
    a: "Exclusiva: un único licenciatario por vez. No exclusiva: múltiples licenciatarios simultáneos. Temporal: por un período definido (ej: 12 meses). Podés configurar el tipo al publicar tu activo.",
  },
  {
    q: "¿Cómo busco dominios?",
    a: "Desde 'Dominios' en el sidebar, escribí el nombre de tu proyecto o marca. Podés filtrar por extensiones (.com, .io, .app, etc.). Los resultados muestran disponibilidad en tiempo real.",
  },
  {
    q: "¿Cómo actualizo mi perfil?",
    a: "Andá a 'Configuración' desde el sidebar. En la pestaña 'Perfil Público' podés actualizar tu nombre, bio, links de redes sociales y más. Los cambios son guardados en tiempo real.",
  },
  {
    q: "¿Cuáles son los tipos de cuenta?",
    a: "Titular de activos (asset_owner): publicás y licenciás tus creaciones. Emprendedor (entrepreneur): buscás activos para licenciar. Administrador (admin): acceso completo al panel de administración.",
  },
];

const QUICK_LINKS = [
  { href: "/dashboard/assets/new", icon: <Package className="h-5 w-5" />, label: "Publicar un activo", color: "text-electric-blue bg-blue-50" },
  { href: "/assets", icon: <Globe className="h-5 w-5" />, label: "Explorar marketplace", color: "text-deep-emerald bg-emerald-50" },
  { href: "/dashboard/requests", icon: <MessageSquare className="h-5 w-5" />, label: "Ver mis solicitudes", color: "text-soft-indigo bg-indigo-50" },
  { href: "/dashboard/settings", icon: <Settings className="h-5 w-5" />, label: "Configurar perfil", color: "text-warm-amber bg-amber-50" },
];

export default function HelpPage() {
  return (
    <div className="p-8 max-w-standard mx-auto">
      {/* Header */}
      <div className="pb-8 border-b border-fog-gray">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="h-8 w-8 text-electric-blue" />
          <h1 className="text-3xl font-bold text-carbon-gray">Centro de Ayuda</h1>
        </div>
        <p className="text-base text-slate-gray">
          Encontrá respuestas a las preguntas más frecuentes sobre Da Vinci Inventa.
        </p>
      </div>

      {/* Quick links */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-carbon-gray mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-4">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <div className="flex items-center gap-3 p-4 bg-white border border-fog-gray rounded-xl hover:border-blue-200 hover:shadow-subtle transition-all group cursor-pointer">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.color}`}>
                  {link.icon}
                </div>
                <span className="text-sm font-medium text-carbon-gray group-hover:text-electric-blue transition-colors">
                  {link.label}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-gray ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-carbon-gray mb-4">Preguntas Frecuentes</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group bg-white border border-fog-gray rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none text-sm font-medium text-carbon-gray hover:bg-snow-gray transition-colors">
                {item.q}
                <ChevronRight className="h-4 w-4 text-slate-gray transition-transform group-open:rotate-90 shrink-0 ml-2" />
              </summary>
              <div className="px-6 pb-4 text-sm text-slate-gray leading-relaxed border-t border-fog-gray pt-3">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="mt-10 p-6 bg-gradient-to-r from-midnight-blue to-electric-blue rounded-xl text-white">
        <h2 className="text-lg font-bold mb-2">¿No encontrás lo que buscás?</h2>
        <p className="text-sm text-white/70 mb-4">
          Nuestro equipo está disponible para ayudarte con cualquier consulta.
        </p>
        <a
          href="mailto:soporte@davinci.com"
          className="inline-block bg-white text-midnight-blue text-sm font-semibold px-4 py-2 rounded-lg hover:bg-snow-gray transition-colors"
        >
          Contactar soporte
        </a>
      </section>
    </div>
  );
}
