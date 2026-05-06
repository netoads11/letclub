import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Splash() {
  const nav = useNavigate();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1400);
    const t2 = setTimeout(() => nav("/auth", { replace: true }), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [nav]);

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-secondary text-secondary-foreground transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"} dark:bg-card dark:text-foreground`}
    >
      {/* Organic blobs */}
      <svg
        className="pointer-events-none absolute -top-20 -left-24 h-[60%] w-[80%] opacity-25 dark:opacity-15"
        viewBox="0 0 400 400"
        aria-hidden
      >
        <path
          d="M0 0 C 200 -20, 380 60, 360 220 C 340 360, 160 360, 40 280 C -60 220, -40 80, 0 0 Z"
          fill="#000"
        />
      </svg>
      <svg
        className="pointer-events-none absolute -bottom-16 left-0 right-0 mx-auto h-[40%] w-[80%] opacity-25 dark:opacity-15"
        viewBox="0 0 400 300"
        aria-hidden
      >
        <path
          d="M40 80 C 120 0, 200 40, 240 100 C 280 160, 320 100, 380 140 L 380 300 L 0 300 L 0 160 C 0 120, 20 100, 40 80 Z"
          fill="#000"
        />
      </svg>

      <div className="fade-in relative z-10 flex flex-col items-center px-10 text-center">
        <Logo
          variant="dark"
          className="w-[60vw] max-w-[280px] dark:hidden"
        />
        <Logo
          variant="light"
          className="hidden w-[60vw] max-w-[280px] dark:block"
        />
        <div className="mt-6 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === 0 ? "w-2 bg-current opacity-100" : "w-2 bg-current opacity-30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
