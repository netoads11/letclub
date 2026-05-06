import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Calendar as CalendarIcon, Plus, Flame, Camera, X } from "lucide-react";
import { getCurrentDay } from "@/lib/challenge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const dateLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const headerLabel = (d: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, today)) return "Hoje";
  if (isSameDay(d, yesterday)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
};

export default function Dieta() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [openAdd, setOpenAdd] = useState(false);

  const day = getCurrentDay(profile?.challenge_start_date ?? null);

  // Form state
  const [tipo, setTipo] = useState<string>("almoco");
  const [nome, setNome] = useState("");
  const [kcal, setKcal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startOfDay = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [selectedDate]);
  const endOfDay = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [selectedDate]);

  const loadLogs = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("refeicoes_log")
      .select("*")
      .eq("user_id", profile.id)
      .gte("registrado_em", startOfDay)
      .lte("registrado_em", endOfDay)
      .order("registrado_em");
    const list = (data ?? []).slice().sort(
      (a: any, b: any) => mealOrder.indexOf(a.tipo_refeicao) - mealOrder.indexOf(b.tipo_refeicao),
    );
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
  }, [profile, startOfDay, endOfDay]);

  // Sugestões: receitas do dia (cardápio sugerido)
  useEffect(() => {
    if (!profile) return;
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
          restr.every((x: string) => (r.restricoes_compativeis ?? []).includes(x)),
        );
      }
      list.sort(
        (a: any, b: any) => mealOrder.indexOf(a.tipo_refeicao) - mealOrder.indexOf(b.tipo_refeicao),
      );
      setSugestoes(list.slice(0, 4));
    })();
  }, [profile, day]);

  const onPickFile = (f: File | null) => {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const resetForm = () => {
    setTipo("almoco");
    setNome("");
    setKcal("");
    setFile(null);
    setPreview(null);
  };

  const salvar = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      let imagem_url: string | null = null;
      if (file) {
        if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem");
        if (file.size > 5 * 1024 * 1024) throw new Error("Imagem maior que 5MB");
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${profile.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("refeicoes").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        imagem_url = supabase.storage.from("refeicoes").getPublicUrl(path).data.publicUrl;
      }
      const registrado_em = (() => {
        const d = new Date(selectedDate);
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes(), 0, 0);
        return d.toISOString();
      })();
      const { error } = await supabase.from("refeicoes_log").insert({
        user_id: profile.id,
        tipo_refeicao: tipo,
        nome: nome || null,
        kcal: kcal ? Number(kcal) : null,
        imagem_url,
        registrado_em,
      });
      if (error) throw error;
      toast.success("Refeição registrada");
      resetForm();
      setOpenAdd(false);
      loadLogs();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const formatHora = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
  };

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
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filtrar por data"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground"
                >
                  <CalendarIcon className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  initialFocus
                  disabled={(d) => d > new Date()}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              aria-label="Adicionar refeição"
              onClick={() => setOpenAdd(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
            >
              <Plus className="h-5 w-5" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-5 pb-6">
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-lg font-bold text-foreground capitalize">
              {headerLabel(selectedDate)}
            </h2>
            <p className="text-xs text-muted-foreground">{dateLabel(selectedDate)}</p>
          </div>

          {logs.length === 0 ? (
            <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
              Nenhuma refeição registrada nesta data.
              <br />
              Toque no <span className="font-bold text-primary">+</span> para adicionar.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[17px] font-semibold text-foreground">
                      {mealLabel[r.tipo_refeicao] ?? r.nome ?? "Refeição"}
                    </h3>
                    {r.nome && mealLabel[r.tipo_refeicao] && (
                      <p className="text-xs text-muted-foreground">{r.nome}</p>
                    )}
                    {r.kcal != null && (
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <Flame className="h-5 w-5 self-center text-secondary" fill="currentColor" />
                        <span className="font-display text-[22px] font-bold leading-none text-foreground">
                          {r.kcal}
                        </span>
                        <span className="text-sm text-muted-foreground">kcal</span>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">{formatHora(r.registrado_em)}</p>
                  </div>
                  <img
                    src={r.imagem_url || placeholderImg}
                    alt={r.nome || "Refeição"}
                    className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {sugestoes.length > 0 && (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Sugestões do dia</h2>
            </div>
            <div className="space-y-3">
              {sugestoes.map((r) => (
                <Link
                  key={r.id}
                  to={`/receita/${r.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card transition-transform active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[17px] font-semibold text-foreground">
                      {mealLabel[r.tipo_refeicao] ?? r.nome}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{r.nome}</p>
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
        )}
      </div>

      {/* Sheet adicionar refeição */}
      <Sheet open={openAdd} onOpenChange={(v) => { setOpenAdd(v); if (!v) resetForm(); }}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-0">
          <div className="sticky top-0 z-10 flex justify-center bg-card pb-2 pt-3">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>
          <div className="px-5 pb-8">
            <h2 className="mb-4 font-display text-xl font-bold text-foreground">Nova refeição</h2>

            <label className="block">
              <div className="relative mx-auto flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted">
                {preview ? (
                  <>
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); onPickFile(null); }}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label="Remover foto"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Camera className="h-7 w-7" />
                    <span className="mt-1 text-xs">Toque para adicionar foto</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="mt-4 space-y-3">
              <div>
                <Label className="text-xs">Tipo de refeição</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mealOrder.map((k) => (
                      <SelectItem key={k} value={k}>{mealLabel[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nome (opcional)</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Omelete com queijo" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Calorias (opcional)</Label>
                <Input type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" className="mt-1.5" />
              </div>
              <Button onClick={salvar} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? "Salvando..." : "Salvar refeição"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
