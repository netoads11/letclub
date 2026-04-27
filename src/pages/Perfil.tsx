import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Settings, LogOut, Flame, Trophy } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getCurrentDay } from "@/lib/challenge";

export default function Perfil() {
  const { profile, refreshProfile, signOut } = useAuth();
  const nav = useNavigate();
  const [pesos, setPesos] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [newPeso, setNewPeso] = useState("");
  const [notif, setNotif] = useState(profile?.notificacoes_ativas ?? true);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name);
    setNotif(profile.notificacoes_ativas);
    (async () => {
      const [p, ub, b] = await Promise.all([
        supabase.from("pesos_historico").select("*").eq("user_id", profile.id).order("registrado_em"),
        supabase.from("user_badges").select("badge_id").eq("user_id", profile.id),
        supabase.from("badges").select("*").eq("ativo", true),
      ]);
      setPesos((p.data ?? []).map((x: any) => ({ data: x.registrado_em.slice(5), peso: Number(x.peso) })));
      setBadges((ub.data ?? []).map((x: any) => x.badge_id));
      setAllBadges(b.data ?? []);
    })();
  }, [profile]);

  if (!profile) return null;
  const day = getCurrentDay(profile.challenge_start_date);

  const saveProfile = async () => {
    await supabase.from("profiles").update({ full_name: name, notificacoes_ativas: notif }).eq("id", profile.id);
    await refreshProfile();
    toast.success("Perfil atualizado");
  };
  const logPeso = async () => {
    const n = parseFloat(newPeso);
    if (!n) return;
    await supabase.from("pesos_historico").insert({ user_id: profile.id, peso: n });
    await supabase.from("profiles").update({ peso_atual: n }).eq("id", profile.id);
    await refreshProfile();
    setNewPeso("");
    toast.success("Peso registrado");
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={() => nav(-1)} className="rounded-full bg-card p-2"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => setShowSettings((s) => !s)} className="rounded-full bg-card p-2"><Settings className="h-5 w-5" /></button>
      </header>
      <div className="mx-auto max-w-md px-5 slide-up">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-primary/40 bg-card">
            {profile.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> :
              <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-primary">{(profile.full_name || "?").charAt(0).toUpperCase()}</div>}
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold">{profile.full_name || "Aluna"}</h1>
          <p className="text-xs text-muted-foreground">Dia {Math.min(day, 15)} de 15 • {profile.xp_total} XP</p>
        </div>

        {/* Weights */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-card p-3"><p className="text-[10px] text-muted-foreground">Inicial</p><p className="font-display font-bold">{profile.peso_inicial ?? "—"} kg</p></div>
          <div className="rounded-xl bg-card p-3"><p className="text-[10px] text-muted-foreground">Atual</p><p className="font-display font-bold text-primary">{profile.peso_atual ?? "—"} kg</p></div>
          <div className="rounded-xl bg-card p-3"><p className="text-[10px] text-muted-foreground">Meta</p><p className="font-display font-bold">{profile.meta_peso ?? "—"} kg</p></div>
        </div>

        {pesos.length > 1 && (
          <div className="mt-5 rounded-2xl bg-card p-4">
            <p className="mb-2 text-xs text-muted-foreground">Sua evolução</p>
            <div className="h-40">
              <ResponsiveContainer><LineChart data={pesos}>
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#141414", border: "1px solid #1E1E1E", borderRadius: 12 }} />
                <Line type="monotone" dataKey="peso" stroke="#CDFF00" strokeWidth={2} dot={{ r: 3, fill: "#CDFF00" }} />
              </LineChart></ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Streak */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card p-4"><Flame className="h-5 w-5 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Sequência</p><p className="font-display text-xl font-bold">{profile.streak_atual} dias</p></div>
          <div className="rounded-xl bg-card p-4"><Trophy className="h-5 w-5 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Recorde</p><p className="font-display text-xl font-bold">{profile.streak_recorde} dias</p></div>
        </div>

        {/* Badges */}
        <h2 className="mt-6 font-display text-lg font-bold">Conquistas</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {allBadges.map((b) => {
            const u = badges.includes(b.id);
            return (
              <div key={b.id} className={`rounded-xl border p-3 text-center ${u ? "border-primary/40 bg-primary/5" : "border-border bg-card opacity-50"}`}>
                <div className={`text-3xl ${!u && "grayscale"}`}>{b.icone}</div>
                <p className="mt-1 text-[10px] font-semibold">{b.nome}</p>
              </div>
            );
          })}
        </div>

        {showSettings && (
          <div className="mt-6 space-y-4 rounded-2xl bg-card p-5">
            <h3 className="font-display font-bold">Configurações</h3>
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
            <div className="flex items-center justify-between"><Label>Notificações</Label><Switch checked={notif} onCheckedChange={setNotif} /></div>
            <Button onClick={saveProfile} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Salvar</Button>

            <div className="pt-4">
              <Label>Registrar novo peso (kg)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input type="number" step="0.1" value={newPeso} onChange={(e) => setNewPeso(e.target.value)} placeholder="64.0" />
                <Button onClick={logPeso} className="bg-primary text-primary-foreground">Registrar</Button>
              </div>
            </div>

            <Button variant="ghost" onClick={async () => { await signOut(); nav("/auth", { replace: true }); }} className="w-full text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
