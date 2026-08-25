import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";


export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-snow-gray dark:bg-[#0d1117] flex flex-col">
      {/* Simple header */}
      <header className="h-16 flex items-center border-b border-fog-gray dark:border-white/10 bg-white dark:bg-gray-900">
        <div className="container-wide">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/Logo DaVinci.png" alt="Da Vinci Inventa" width={44} height={44} className="rounded-lg" priority />
            <span className="font-semibold text-lg text-midnight-blue dark:text-gray-100">Da Vinci Inventa</span>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-gray dark:text-gray-500 border-t border-fog-gray dark:border-white/10 bg-white dark:bg-gray-900">
        © {new Date().getFullYear()} Da Vinci Inventa ·{" "}
        <Link href="/terms" className="hover:text-electric-blue">
          Términos
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="hover:text-electric-blue">
          Privacidad
        </Link>
      </footer>
    </div>
  );
}
