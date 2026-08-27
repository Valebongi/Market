"use client";

import { useState, useEffect } from "react";
import Avatar from "@/components/ui/Avatar";
import ReputationBadges, { type OwnerStats } from "@/components/ui/ReputationBadges";
import OwnerProfileLink from "./OwnerProfileLink";
import { usersService as usersApi } from "@/services/users.service";
import { assetsService } from "@/services/assets.service";

interface Props {
  ownerId: string;
}

export default function AssetOwnerInline({ ownerId }: Props) {
  const [ownerName, setOwnerName] = useState<string>(`Titular ${ownerId.slice(0, 6)}`);
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
      if (p?.linkedin) setOwnerLink(p.linkedin);
      setOwnerStats({
        publishedAssets: assets?.total ?? 0,
        hasCompletedProfile: !!p?.bio,
        hasAvatarOrBio: !!(p?.avatarUrl || p?.bio),
      });
    });
  }, [ownerId]);

  return (
    <div className="mt-5 flex items-start gap-3">
      <Avatar name={ownerName} size="sm" />
      <div>
        <p className="text-sm font-medium text-carbon-gray dark:text-gray-100">{ownerName}</p>
        <p className="text-xs text-slate-gray dark:text-gray-400">Titular del activo</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {ownerStats && <ReputationBadges stats={ownerStats} size="sm" />}
          <OwnerProfileLink url={ownerLink} size="sm" />
        </div>
      </div>
    </div>
  );
}
