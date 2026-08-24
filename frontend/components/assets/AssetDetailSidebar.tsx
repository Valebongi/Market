"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Shield, Pencil, Bookmark, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import ReputationBadges, { type OwnerStats } from "@/components/ui/ReputationBadges";
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
  const [ownerLinkedin, setOwnerLinkedin] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      usersApi.getProfile(ownerId).catch(() => null),
      assetsService.list({ ownerId, status: "published", limit: 1 }).catch(() => null),
    ]).then(([profile, assets]) => {
      // API returns flat profile shape at runtime
      const p = profile as unknown as { displayName?: string; bio?: string; avatarUrl?: string; linkedin?: string };
      if (p?.displayName) setOwnerName(p.displayName);
      if (p?.bio) setOwnerBio(p.bio);
      if (p?.linkedin) setOwnerLinkedin(p.linkedin);
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

        {ownerLinkedin && (
          <a
            href={ownerLinkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A66C2] bg-[#0A66C2]/8 border border-[#0A66C2]/20 px-3 py-1.5 rounded-lg hover:bg-[#0A66C2]/15 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Ver perfil en LinkedIn
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        )}

        {ownerBio && (
          <p className="mt-4 text-sm text-slate-gray dark:text-gray-400 leading-relaxed line-clamp-3">
            {ownerBio}
          </p>
        )}
      </div>
    </div>
  );
}
