import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Clock } from "lucide-react";

const tabs = [
  { v: "cafe", l: "Café" },
  { v: "almoco", l: "Almoço" },
  { v: "lanche", l: "Lanche" },
  { v: "jantar", l: "Jantar" },
  { v: "cha", l: "Chás" },
];

const mealVisuals: Record<string, { gradient: string; icon: string }> = {
  cafe: { gradient: "linear-gradient(135deg, #1A1000 0%, #2A1A00 100%)", icon: "☀️" },
  almoco: { gradient: "linear-gradient(135deg, #001A0A 0%, #002A10 100%)", icon: "🥗" },
  lanche: { gradient: "linear-gradient(135deg, #1A0A00 0%, #2A1000 100%)", icon: "🍎" },
  jantar: { gradient: "linear-gradient(135deg, #0A0A1A 0%, #10102A 100%)", icon: "🌙" },
  cha: { gradient: "linear-gradient(135deg, #001A1A 0%, #002A2A 100%)", icon: "🍵" },
};

const restrColors: Record<string, string> = {
  vegetariana: "border-green-500/40 text-green-400",
  lactose: "border-yellow-500/40 text-yellow-400",
  gluten: "border-orange-500/40 text-orange-400",
  gestante: "border-purple-500/40 text-purple-400",
};

export default function Dieta() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("cafe");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      let q = supabase.from("receitas").select("*").eq("tipo_refeicao", tab as any).eq("ativo", true);
      const { data } = await q;
      let list = data ?? [];
      const restr = profile?.restricoes_alimentares ?? [];
      if (restr.length) {
        list = list.filter((r: any) =>
          restr.every((x: string) => (r.restricoes_compativeis ?? []).includes(x)),
        );
      }
      setItems(list);
    })();
  }, [tab, profile]);

  return (
    <AppShell>
      <header className="px-4 pt-6 pb-4">
        <h1 className="font-display text-[26px] font-bold leading-tight text-white">Dieta</h1>
        <p className="mt-1 text-sm text-[#888]">Receitas pra sua jornada</p>
      </header>

      {/* Pill tabs */}
      <div className="scrollbar-hide mb-4 flex gap-2 overflow-x-auto px-4">
        {tabs.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
              tab === t.v
                ? "bg-primary text-primary-foreground"
                : "bg-[#1E1E1E] text-[#888] hover:text-white"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <p className="px-4 pb-2 text-[11px] uppercase tracking-widest text-[#888]">
        {items.length} {items.length === 1 ? "receita" : "receitas"}
      </p>

      <div className="space-y-3 px-4 pb-5">
        {items.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-4xl">🍽️</p>
            <p className="mt-3 text-sm text-[#888]">Nenhuma receita compatível.</p>
          </div>
        )}
        {items.map((r) => {
          const visual = mealVisuals[r.tipo_refeicao] ?? mealVisuals.cafe;
          return (
            <Link
              key={r.id}
              to={`/receita/${r.id}`}
              className="block overflow-hidden rounded-2xl bg-[#141414] transition-all hover:ring-1 hover:ring-primary/40"
            >
              {r.imagem_url ? (
                <img src={r.imagem_url} className="h-32 w-full object-cover" alt={r.nome} />
              ) : (
                <div
                  className="flex h-20 w-full items-center justify-center text-3xl"
                  style={{ background: visual.gradient }}
                >
                  {visual.icon}
                </div>
              )}
              <div className="p-3.5">
                <h3 className="font-display text-[15px] font-medium text-white">{r.nome}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-[#888]">
                    <Clock className="h-3 w-3" /> {r.tempo_preparo} min
                  </span>
                  {(r.restricoes_compativeis ?? []).slice(0, 3).map((x: string) => (
                    <span
                      key={x}
                      className={`rounded-full border bg-transparent px-2 py-0.5 text-[10px] capitalize ${restrColors[x] ?? "border-[#2A2A2A] text-[#888]"}`}
                    >
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
