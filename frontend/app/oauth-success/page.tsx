"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function OAuthSuccessHandler() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get("token");
    const userRaw = params.get("user");
    const returnTo = params.get("returnTo") || "/dashboard";

    if (token && userRaw) {
      try {
        localStorage.setItem("davinci_token", token);
        localStorage.setItem("davinci_user", userRaw);
      } catch {
        // localStorage unavailable
      }
    }

    router.replace(returnTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-snow-gray">
      <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-snow-gray">
          <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OAuthSuccessHandler />
    </Suspense>
  );
}
