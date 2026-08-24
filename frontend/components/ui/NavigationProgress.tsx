"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    // Start progress
    setWidth(0);
    setVisible(true);

    // Animate to ~80% quickly
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setWidth(80);
      });
    });

    // Then complete after a short delay
    timerRef.current = setTimeout(() => {
      setWidth(100);
      setTimeout(() => setVisible(false), 300);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ background: "transparent" }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "linear-gradient(to right, #22c55e, #84cc16, #d9f99d)",
          boxShadow: "0 0 12px 2px rgba(132,204,22,0.7)",
          transition: width === 0 ? "none" : width === 100 ? "width 0.2s ease-out" : "width 0.4s cubic-bezier(0.1,0.8,0.3,1)",
        }}
      />
    </div>
  );
}
