"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Shield, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";
import { usersApi } from "@/lib/api";

interface Props {
  assetId: string;
  ownerId: string;
  assetTitle: string;
  priceDisplay: string;
}

export default function AssetDetailSidebar({ assetId, ownerId, assetTitle, priceDisplay }: Props) {
  const { user } = useAuth();
  const [ownerName, setOwnerName] = useState<string>(`Titular ${ownerId.slice(0, 6)}`);
  const [ownerBio, setOwnerBio] = useState<string | null>(null);

  useEffect(() => {
    usersApi.getProfile(ownerId)
      .then((profile) => {
        if (profile?.displayName) setOwnerName(profile.displayName);
        if (profile?.bio) setOwnerBio(profile.bio);
      })
      .catch(() => {});
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

            <Link
              href={`/dashboard/requests/new?assetId=${assetId}&title=${encodeURIComponent(assetTitle)}&ownerId=${ownerId}`}
            >
              <Button variant="secondary" fullWidth size="lg">
                Contactar Titular
              </Button>
            </Link>
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

        {ownerBio && (
          <p className="mt-4 text-sm text-slate-gray dark:text-gray-400 leading-relaxed line-clamp-3">
            {ownerBio}
          </p>
        )}
      </div>
    </div>
  );
}
