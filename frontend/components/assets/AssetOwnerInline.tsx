"use client";

import { useState, useEffect } from "react";
import Avatar from "@/components/ui/Avatar";
import { usersApi } from "@/lib/api";

interface Props {
  ownerId: string;
}

export default function AssetOwnerInline({ ownerId }: Props) {
  const [ownerName, setOwnerName] = useState<string>(`Titular ${ownerId.slice(0, 6)}`);

  useEffect(() => {
    usersApi.getProfile(ownerId)
      .then((profile) => {
        if (profile?.displayName) setOwnerName(profile.displayName);
      })
      .catch(() => {});
  }, [ownerId]);

  return (
    <div className="mt-5 flex items-center gap-3">
      <Avatar name={ownerName} size="sm" />
      <div>
        <p className="text-sm font-medium text-carbon-gray">{ownerName}</p>
        <p className="text-xs text-slate-gray">Titular del activo</p>
      </div>
    </div>
  );
}
