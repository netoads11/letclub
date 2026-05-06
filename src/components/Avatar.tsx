import { useState } from "react";
import { cn } from "@/lib/utils";

type Shape = "rounded-full" | "rounded-2xl" | "rounded-3xl" | "rounded-xl";

function getInitials(name?: string | null): string {
  const n = (name || "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({
  name,
  url,
  size = 40,
  shape = "rounded-full",
  className,
  textClassName,
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
  shape?: Shape;
  className?: string;
  textClassName?: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImg = !!url && !errored;
  const fontSize = Math.max(12, Math.round(size * 0.38));

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-secondary text-secondary-foreground",
        shape,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        <img
          src={url!}
          alt={name || ""}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span
          className={cn("font-display font-bold leading-none", textClassName)}
          style={{ fontSize }}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}

export { getInitials };