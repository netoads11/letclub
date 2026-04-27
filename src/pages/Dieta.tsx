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

export default function Dieta() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("cafe");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      let q = supabase.from("receitas").select("*").eq("tipo_refeicao", tab as any).eq("ativo", true);
      const { data } = await q;
      let list = data ?? [];
      // Filter by user restrictions: recipe must be compatible with all user restrictions
      const restr = profile?.restricoes_alimentares ?? [];
      if (restr.length) {
        list = list.filter((r: any) => restr.every((x: string) => (r.restricoes_compativeis ?? []).includes(x)));
      }
      setItems(list);
    })();
  }, [tab, profile]);

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold">Dieta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Receitas pra sua jornada</p>
      </header>

      <div className="scrollbar-hide mb-4 flex gap-2 overflow-x-auto px-5">
        {tabs.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${tab === t.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
          >{t.l}</button>
        ))}
      </div>

      <div className="space-y-3 px-5 pb-5">
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma receita compatível.</p>
        )}
        {items.map((r) => (
          <Link key={r.id} to={`/receita/${r.id}`} className="block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
            {r.imagem_url && <img src={r.imagem_url} className="h-36 w-full object-cover" alt={r.nome} />}
            <div className="p-4">
              <h3 className="font-semibold">{r.nome}</h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.tempo_preparo} min</span>
                {(r.restricoes_compativeis ?? []).slice(0, 3).map((x: string) => (
                  <span key={x} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{x}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
