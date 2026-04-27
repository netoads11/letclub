import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Splash() {
  const nav = useNavigate();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1400);
    const t2 = setTimeout(() => nav("/auth", { replace: true }), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [nav]);

  return (
    <div className={`flex min-h-screen items-center justify-center bg-background transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}>
      <div className="text-center fade-in">
        <h1 className="font-display text-5xl font-extrabold tracking-tight text-primary text-glow">
          LET<span className="text-foreground">&amp;</span>PONTO
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Sua jornada de 15 dias</p>
        <div className="mx-auto mt-8 h-12 w-12 rounded-full bg-primary/20 pulse-glow" />
      </div>
    </div>
  );
}
