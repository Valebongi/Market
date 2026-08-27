"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Shield, Pencil, Bookmark } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import ReputationBadges, { type OwnerStats } from "@/components/ui/ReputationBadges";
import OwnerProfileLink from "./OwnerProfileLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useSavedAssets } from "@/lib/saved-assets-context";
import { usersService as usersApi } from "@/services/users.service";
import { assetsService } from "@/services/assets.service";

interface Props {
  assetId: string;
  ownerId: string;
  assetTitle: string;
  priceDisplay: string;
}

export default function AssetDetailSidebar({ assetId, ownerId, assetTitle, priceDisplay }: Props) {
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedAssets();
  const [ownerName, setOwnerName] = useState<string>(`Titular ${ownerId.slice(0, 6)}`);
  const [ownerBio, setOwnerBio] = useState<string | null>(null);
  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null);
  const [ownerLink, setOwnerLink] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      usersApi.getProfile(ownerId).catch(() => null),
      assetsService.list({ ownerId, status: "published", limit: 1 }).catch(() => null),
    ]).then(([profile, assets]) => {
      // API returns flat profile shape at runtime
      const p = profile as unknown as { displayName?: string; bio?: string; avatarUrl?: string; linkedin?: string };
      if (p?.displayName) setOwnerName(p.displayName);
      if (p?.bio) setOwnerBio(p.bio);
      if (p?.linkedin) setOwnerLink(p.linkedin);
      setOwnerStats({
        publishedAssets: assets?.total ?? 0,
        hasCompletedProfile: !!p?.bio,
        hasAvatarOrBio: !!(p?.avatarUrl || p?.bio),
      });
    });
  }, [ownerId]);

  const isOwner = !!user && user.id === ownerId;

  return (
    <div className="space-y-4 sticky top-24">
      {/* Action Card */}
      <div className="bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6 shadow-subtle">
        <p className="text-xs font-medium text-slate-gray dark:text-gray-400 uppercase tracking-wide">Precio estimado</p>
        <p className="mt-1 text-3xl font-bold text-carbon-gray dark:text-gray-100">{priceDisplay}</p>

        <div className="my-5 border-t border-fog-gray dark:border-white/10" />

        {isOwner ? (
          <div className="space-y-3">
            <p className="text-sm text-center text-slate-gray dark:text-gray-400 font-medium">Este es tu activo</p>
            <Link href="/dashboard/assets">
              <Button variant="secondary" fullWidth icon={<Pencil className="h-4 w-4" />}>
                Ir a mis activos
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Link
              href={`/dashboard/requests/new?assetId=${assetId}&title=${encodeURIComponent(assetTitle)}&ownerId=${ownerId}`}
            >
              <Button fullWidth size="lg" className="mb-3">
                Solicitar Licencia
              </Button>
            </Link>

            <div className="flex gap-2">
              <Link
                href={`/dashboard/requests/new?assetId=${assetId}&title=${encodeURIComponent(assetTitle)}&ownerId=${ownerId}`}
                className="flex-1"
              >
                <Button variant="secondary" fullWidth size="lg">
                  Contactar Titular
                </Button>
              </Link>

              <button
                onClick={() => toggleSave(assetId)}
                aria-label={isSaved(assetId) ? "Quitar de guardados" : "Guardar activo"}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-xl border transition-colors",
                  isSaved(assetId)
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-electric-blue dark:text-blue-400"
                    : "border-fog-gray dark:border-white/10 text-slate-gray dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-800 hover:text-electric-blue dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                )}
              >
                <Bookmark className={cn("h-5 w-5", isSaved(assetId) && "fill-current")} />
              </button>
            </div>
          </>
        )}

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-gray dark:text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Respuesta promedio: 24 horas</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-gray dark:text-gray-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Plataforma segura de intermediación</span>
          </div>
        </div>
      </div>

      {/* Owner Card */}
      <div className="bg-snow-gray dark:bg-gray-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Avatar name={ownerName} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-carbon-gray dark:text-gray-100">{ownerName}</p>
            <Badge variant="primary" className="mt-1">Titular</Badge>
          </div>
        </div>

        {ownerStats && (
          <ReputationBadges stats={ownerStats} size="sm" className="mt-3" />
        )}

        <OwnerProfileLink url={ownerLink} className="mt-2.5" />

        {ownerBio && (
          <p className="mt-4 text-sm text-slate-gray dark:text-gray-400 leading-relaxed line-clamp-3">
            {ownerBio}
          </p>
        )}
      </div>
    </div>
  );
}
