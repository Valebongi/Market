"use client";

import { ShieldAlert } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";

/**
 * ⚠️ ESTO NO ES UNA BARRERA DE SEGURIDAD. Es experiencia de usuario.
 *
 * El rol que lee `useAuth()` sale de `localStorage.davinci_user`, que el propio
 * usuario edita a mano: con dos líneas en la consola del browser se pone
 * `role: "admin"` y este layout lo deja pasar. Nadie debe apoyarse en este
 * archivo para proteger nada.
 *
 * Quien realmente protege el panel es el backend: el gateway valida el JWT
 * (firmado, no editable desde el cliente), inyecta `x-user-role` y admin-service
 * responde 403 a cualquier rol que no sea `admin`. Un usuario que se falsifique
 * el rol en localStorage llega a estas pantallas y no ve un solo dato: todas las
 * llamadas vuelven 403.
 *
 * Lo único que arregla este layout es que, sin él, un usuario común que navegara
 * a /dashboard/admin/* aterrizaba en una pantalla rota llena de errores en vez
 * de un "no tenés acceso" claro.
 *
 * Si algún día hace falta seguridad de verdad acá, va en el backend, no en este
 * componente.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // El layout padre (/dashboard) ya bloquea el render mientras carga la sesión y
  // redirige a /login si no hay usuario. Esto es sólo defensa en profundidad por
  // si ese layout cambia.
  if (loading || !user) return null;

  if (user.role !== "admin") {
    return (
      <div className="p-6 sm:p-8">
        <EmptyState
          icon={<ShieldAlert className="h-8 w-8" />}
          title="No tenés acceso a esta sección"
          description="El panel de administración está reservado para las cuentas con rol de administrador. Si creés que deberías tener acceso, escribinos desde el centro de ayuda."
          action={{ label: "Volver al panel", href: "/dashboard" }}
          secondaryAction={{ label: "Ir a ayuda", href: "/dashboard/help", variant: "link" }}
          size="lg"
        />
      </div>
    );
  }

  return <>{children}</>;
}
