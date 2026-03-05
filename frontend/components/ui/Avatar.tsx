import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { container: "h-8 w-8", text: "text-xs" },
  md: { container: "h-10 w-10", text: "text-sm" },
  lg: { container: "h-16 w-16", text: "text-lg" },
  xl: { container: "h-24 w-24", text: "text-2xl" },
};

// Simple color hash from name
function nameToColor(name: string): string {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-indigo-100 text-indigo-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-teal-100 text-teal-700",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const { container, text } = sizeMap[size];

  if (src) {
    return (
      <div className={cn("relative rounded-full overflow-hidden flex-shrink-0", container, className)}>
        <Image src={src} alt={name} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 font-semibold",
        container,
        text,
        nameToColor(name),
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
