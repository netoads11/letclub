import { cn } from "@/lib/utils";

/**
 * LETClub wordmark + lime speech bubble + lime wavy underline.
 * Adapts to light/dark via currentColor; pass `variant="auto"` to use foreground,
 * or `variant="light"` / `variant="dark"` to force a color.
 */
type Props = {
  className?: string;
  variant?: "auto" | "light" | "dark";
};

export const Logo = ({ className, variant = "auto" }: Props) => {
  const color =
    variant === "light" ? "#FFFFFF" : variant === "dark" ? "#1A1A1A" : "currentColor";
  const lime = "#BFDB1E";

  return (
    <svg
      viewBox="0 0 360 120"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label="LETClub"
    >
      {/* Wordmark */}
      <g fill={color} fontFamily="Intelo, system-ui, sans-serif">
        <text x="0" y="74" fontSize="74" fontWeight="800" letterSpacing="-1">LET</text>
        <text x="148" y="74" fontSize="74" fontWeight="500" letterSpacing="-1">Club</text>
      </g>

      {/* Lime wavy underline under "LET" */}
      <path
        d="M4 92 Q 22 84, 40 92 T 76 92 T 112 92 T 148 92"
        stroke={lime}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Speech bubble with thumbs-up */}
      <g transform="translate(296,8)">
        <path
          d="M28 0 C44 0, 56 12, 56 28 C56 44, 44 56, 28 56 L18 56 L8 68 L12 54 C4 49, 0 39, 0 28 C0 12, 12 0, 28 0 Z"
          fill={lime}
          stroke={color}
          strokeWidth="2.5"
        />
        {/* Thumbs-up glyph */}
        <path
          d="M18 32 L18 44 L22 44 L22 32 Z M24 30 L24 44 L36 44 C38 44, 40 42, 40 40 L41 34 C41 32, 40 31, 38 31 L32 31 L33 26 C33 24, 32 23, 30 23 C29 23, 28 24, 27 25 L24 30 Z"
          fill={color}
        />
      </g>
    </svg>
  );
};

export default Logo;