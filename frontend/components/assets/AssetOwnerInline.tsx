"use client";

import { useState, useEffect } from "react";
import Avatar from "@/components/ui/Avatar";
import ReputationBadges, { type OwnerStats } from "@/components/ui/ReputationBadges";
import { usersService as usersApi } from "@/services/users.service";
import { assetsService } from "@/services/assets.service";

interface Props {
  ownerId: string;
}

function LinkedInBadge({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20 hover:bg-[#0A66C2]/20 transition-colors"
    >
      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
      Verificado en LinkedIn
    </a>
  );
}

export default function AssetOwnerInline({ ownerId }: Props) {
  const [ownerName, setOwnerName] = useState<string>(`Titular ${ownerId.slice(0, 6)}`);
  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null);
  const [linkedin, setLinkedin] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      usersApi.getProfile(ownerId).catch(() => null),
      assetsService.list({ ownerId, status: "published", limit: 1 }).catch(() => null),
    ]).then(([profile, assets]) => {
      // API returns flat profile shape at runtime
      const p = profile as unknown as { displayName?: string; bio?: string; avatarUrl?: string; linkedin?: string };
      if (p?.displayName) setOwnerName(p.displayName);
      if (p?.linkedin) setLinkedin(p.linkedin);
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
          {linkedin && <LinkedInBadge url={linkedin} />}
        </div>
      </div>
    </div>
  );
}
