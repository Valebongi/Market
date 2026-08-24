"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { usersService } from "@/services/users.service";

interface SavedAssetsContextValue {
  savedIds: Set<string>;
  isSaved: (assetId: string) => boolean;
  toggleSave: (assetId: string) => Promise<void>;
  loading: boolean;
}

const SavedAssetsContext = createContext<SavedAssetsContextValue>({
  savedIds: new Set(),
  isSaved: () => false,
  toggleSave: async () => {},
  loading: false,
});

export function SavedAssetsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // El efecto depende de la IDENTIDAD del usuario, no del objeto: `user` se
  // re-crea en cada rehidratación del AuthProvider y meterlo en el array de
  // dependencias re-dispararía el fetch sin que cambie nada. Derivando el id
  // acá, el efecto no referencia `user` y las dependencias quedan completas.
  const userId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setSavedIds(new Set());
      return;
    }
    setLoading(true);
    usersService
      .getSavedAssets(userId)
      .then(({ data }) => setSavedIds(new Set(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, userId]);

  const toggleSave = useCallback(
    async (assetId: string) => {
      if (!user) return;
      const wasSaved = savedIds.has(assetId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(assetId);
        else next.add(assetId);
        return next;
      });
      try {
        if (wasSaved) {
          await usersService.unsaveAsset(user.id, assetId);
        } else {
          await usersService.saveAsset(user.id, assetId);
        }
      } catch {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(assetId);
          else next.delete(assetId);
          return next;
        });
      }
    },
    [user, savedIds]
  );

  const isSaved = useCallback((assetId: string) => savedIds.has(assetId), [savedIds]);

  return (
    <SavedAssetsContext.Provider value={{ savedIds, isSaved, toggleSave, loading }}>
      {children}
    </SavedAssetsContext.Provider>
  );
}

export function useSavedAssets() {
  return useContext(SavedAssetsContext);
}
