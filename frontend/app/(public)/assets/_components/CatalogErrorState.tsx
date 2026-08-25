"use client";

import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Estado de "no pudimos cargar el catálogo".
 *
 * Es cliente por una sola razón: reintentar ahora significa volver a pedirle la
 * página al servidor (`router.refresh()`), y eso no se puede disparar desde un
 * Server Component. El copy es el mismo de antes — distinguir un gateway caído
 * de un catálogo vacío sigue siendo lo importante.
 */
export default function CatalogErrorState() {
  const router = useRouter();

  return (
    <EmptyState
      size="lg"
      iconStyle="bare"
      icon="⚠️"
      title="No pudimos cargar el catálogo"
      description="Hubo un problema de conexión con el servidor. Probá de nuevo en unos segundos."
      action={{
        label: "Reintentar",
        onClick: () => router.refresh(),
        variant: "link",
      }}
    />
  );
}
