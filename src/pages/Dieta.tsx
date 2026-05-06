import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Calendar, Plus, Flame } from "lucide-react";
import { getCurrentDay } from "@/lib/challenge";

const mealLabel: Record<string, string> = {
  cafe: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  cha: "Chá",
};

const mealOrder = ["cafe", "almoco", "lanche", "jantar", "cha"];

const placeholderImg =
  "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&h=200&fit=crop";

// Deterministic pseudo-kcal range until schema gains a real field.
function pseudoKcal(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const base = 320 + (h % 200);
  return `${base}-${base + 100}`;
}

const dateLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export default function Dieta() {
  const { profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  const day = getCurrentDay(profile?.challenge_start_date ?? null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("receitas")
        .select("*")
        .eq("ativo", true)
        .or(`dia_numero.is.null,dia_numero.eq.${day}`);
      let list = data ?? [];
      const restr = profile?.restricoes_alimentares ?? [];
      if (restr.length) {
        list = list.filter((r: any) =>
          restr.every((x: string) =>
            (r.restricoes_compativeis ?? []).includes(x),
          ),
        );
      }
      list.sort(
        (a: any, b: any) =>
          mealOrder.indexOf(a.tipo_refeicao) -
          mealOrder.indexOf(b.tipo_refeicao),
      );
      setItems(list);
    })();
  }, [profile, day]);

  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);

  // For now we display the same recipe list under "Hoje". When meal-logging is
  // added, "Ontem" will pull from a real history table.
  const groups = [
    { title: "Hoje", date: today, items },
    { title: "Ontem", date: yesterday, items: items.slice(0, 2) },
  ];

  return (
    <AppShell>
      <header className="px-5 pt-7 pb-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Meu Cardápio</p>
            <h1 className="mt-0.5 font-display text-[28px] font-bold leading-tight text-foreground">
              Histórico de
              <br />
              alimentação
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Calendário"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground"
            >
              <Calendar className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Adicionar refeição"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
            >
              <Plus className="h-5 w-5" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-5 pb-6">
        {groups.map((group) => (
          <section key={group.title}>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                {group.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {dateLabel(group.date)}
              </p>
            </div>

            {group.items.length === 0 && (
              <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
                Nenhuma refeição registrada.
              </div>
            )}

            <div className="space-y-3">
              {group.items.map((r) => (
                <Link
                  key={`${group.title}-${r.id}`}
                  to={`/receita/${r.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card transition-transform active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[17px] font-semibold text-foreground">
                      {mealLabel[r.tipo_refeicao] ?? r.nome}
                    </h3>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <Flame
                        className="h-5 w-5 self-center text-secondary"
                        fill="currentColor"
                      />
                      <span className="font-display text-[22px] font-bold leading-none text-foreground">
                        {pseudoKcal(r.id)}
                      </span>
                      <span className="text-sm text-muted-foreground">kcal</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {group.title === "Hoje"
                        ? "09h31"
                        : `${dateLabel(group.date).split(" de ").slice(0, 2).join(" de ")}  09h31`}
                    </p>
                  </div>
                  <img
                    src={r.imagem_url || placeholderImg}
                    alt={r.nome}
                    className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                  />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
