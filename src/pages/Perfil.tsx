import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Settings, LogOut, Flame, Trophy, Mail, Lock, Bell, Utensils, Scale, LifeBuoy, User, Camera } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { getCurrentDay } from "@/lib/challenge";

const RESTRICOES = ["vegetariana", "lactose", "gluten", "gestante"];

export default function Perfil() {
  const { profile, refreshProfile, signOut, user } = useAuth();
  const nav = useNavigate();
  const [pesos, setPesos] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Profile fields
  const [name, setName] = useState(profile?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);

  // Email/password
  const [newEmail, setNewEmail] = useState(profile?.email ?? "");
  const [newPassword, setNewPassword] = useState("");

  // Settings
  const [notif, setNotif] = useState(profile?.notificacoes_ativas ?? true);
  const [restricoes, setRestricoes] = useState<string[]>(profile?.restricoes_alimentares ?? []);

  // Weight
  const [newPeso, setNewPeso] = useState("");

  // Logout confirm
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name);
    setAvatarUrl(profile.avatar_url);
    setNewEmail(profile.email);
    setNotif(profile.notificacoes_ativas);
    setRestricoes(profile.restricoes_alimentares ?? []);
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
    const { error } = await supabase.from("profiles").update({
      full_name: name,
      avatar_url: avatarUrl,
      notificacoes_ativas: notif,
      restricoes_alimentares: restricoes,
    }).eq("id", profile.id);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Perfil atualizado");
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
      await refreshProfile();
      toast.success("Foto atualizada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const updateEmail = async () => {
    if (!newEmail || newEmail === profile.email) return toast.error("Informe um novo e-mail");
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) return toast.error(error.message);
    toast.success("Confirme no e-mail antigo e novo para concluir");
  };

  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) return toast.error("Mínimo 6 caracteres");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return toast.error(error.message);
    setNewPassword("");
    toast.success("Senha atualizada");
  };

  const logPeso = async () => {
    const n = parseFloat(newPeso);
    if (!n) return;
    await supabase.from("pesos_historico").insert({ user_id: profile.id, peso: n });
    await supabase.from("profiles").update({ peso_atual: n }).eq("id", profile.id);
    await refreshProfile();
    setNewPeso("");
    toast.success("Peso registrado");
    // refresh local chart
    const { data } = await supabase.from("pesos_historico").select("*").eq("user_id", profile.id).order("registrado_em");
    setPesos((data ?? []).map((x: any) => ({ data: x.registrado_em.slice(5), peso: Number(x.peso) })));
  };

  const toggleRestricao = (r: string, v: boolean) => {
    setRestricoes((p) => (v ? [...p, r] : p.filter((x) => x !== r)));
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="flex items-center justify-between px-4 py-4">
        <button
          onClick={() => nav(-1)}
          className="rounded-full border border-[#1E1E1E] bg-[#141414] p-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className={`rounded-full p-2 transition-colors ${
            showSettings ? "bg-primary text-primary-foreground" : "border border-[#1E1E1E] bg-[#141414]"
          }`}
          aria-label="Configurações"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <div className="mx-auto max-w-md slide-up">
        {/* Hero header with radial gradient */}
        <div
          className="px-4 pb-2 pt-2 text-center"
          style={{
            background:
              "radial-gradient(ellipse at center top, rgba(205,255,0,0.05) 0%, transparent 60%)",
          }}
        >
          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border border-[#1E1E1E] bg-[#1E1E1E]">
            {avatarUrl ? (
              <img src={avatarUrl} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-[28px] font-bold text-primary">
                {(profile.full_name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display text-[22px] font-bold text-white">
            {profile.full_name || "Aluna"}
          </h1>
          <p className="text-[13px] text-[#888]">
            Dia {Math.min(day, 15)} de 15 • {profile.xp_total} XP
          </p>
        </div>

        <div className="px-4">
          {/* Weights */}
          <p className="mt-6 mb-2 text-[11px] uppercase tracking-widest text-[#888]">Peso</p>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-3">
              <p className="text-[10px] text-[#888]">Inicial</p>
              <p className="mt-1 font-display text-base font-bold text-white">
                {profile.peso_inicial ?? "—"} <span className="text-xs text-[#888]">kg</span>
              </p>
            </div>
            <div className="rounded-xl border border-primary bg-[#141414] p-3">
              <p className="text-[10px] text-[#888]">Atual</p>
              <p className="mt-1 font-display text-base font-bold text-primary">
                {profile.peso_atual ?? "—"} <span className="text-xs">kg</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-3">
              <p className="text-[10px] text-[#888]">Meta</p>
              <p className="mt-1 font-display text-base font-bold text-white">
                {profile.meta_peso ?? "—"} <span className="text-xs text-[#888]">kg</span>
              </p>
            </div>
          </div>

          {/* Evolution chart */}
          {pesos.length > 1 && (
            <>
              <p className="mt-6 mb-2 text-[11px] uppercase tracking-widest text-[#888]">
                Evolução
              </p>
              <div className="rounded-2xl border border-[#1E1E1E] bg-[#141414] p-4">
                <div className="h-40">
                  <ResponsiveContainer>
                    <LineChart data={pesos}>
                      <CartesianGrid stroke="#1E1E1E" vertical={false} />
                      <XAxis dataKey="data" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#888" }} domain={["auto", "auto"]} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#141414",
                          border: "1px solid #1E1E1E",
                          borderRadius: 12,
                          color: "#fff",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        stroke="#CDFF00"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#CDFF00", stroke: "#CDFF00" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Streak */}
          <p className="mt-6 mb-2 text-[11px] uppercase tracking-widest text-[#888]">
            Sequências
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-4">
              <Flame className="h-5 w-5 text-[#FF6B00]" fill="#FF6B00" />
              <p className="mt-2 text-[11px] text-[#888]">Sequência</p>
              <p className="font-display text-2xl font-bold text-white">
                {profile.streak_atual} <span className="text-sm text-[#888]">dias</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#1E1E1E] bg-[#141414] p-4">
              <Trophy className="h-5 w-5 text-primary" />
              <p className="mt-2 text-[11px] text-[#888]">Recorde</p>
              <p className="font-display text-2xl font-bold text-white">
                {profile.streak_recorde} <span className="text-sm text-[#888]">dias</span>
              </p>
            </div>
          </div>

          {/* Badges */}
          <p className="mt-6 mb-2 text-[11px] uppercase tracking-widest text-[#888]">
            Conquistas
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {allBadges.map((b) => {
              const u = badges.includes(b.id);
              return (
                <div
                  key={b.id}
                  className={`relative rounded-xl border p-3 text-center transition-all ${
                    u
                      ? "border-primary/30 bg-[#141414]"
                      : "border-[#1E1E1E] bg-[#141414] opacity-30"
                  }`}
                >
                  <div className={`text-[32px] leading-none ${!u && "grayscale"}`}>{b.icone}</div>
                  <p className="mt-2 font-display text-[11px] text-[#CCC]">{b.nome}</p>
                  {!u && (
                    <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-[#444]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SETTINGS PANEL */}
        {showSettings && (
          <div className="mt-6 space-y-3 px-4 fade-in">
            {/* Section: profile */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><User className="h-4 w-4 text-primary" /> Perfil</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-border bg-background">
                    {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" /> :
                      <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-primary">{(name || "?").charAt(0).toUpperCase()}</div>}
                  </div>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-muted">
                      <Camera className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Trocar foto"}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                  </label>
                </div>
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
                </div>
                <Button onClick={saveProfile} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Salvar perfil</Button>
              </div>
            </section>

            {/* Section: account */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><Mail className="h-4 w-4 text-primary" /> E-mail e senha</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                    <Button onClick={updateEmail} variant="outline" size="sm">Atualizar</Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Lock className="h-3 w-3" /> Nova senha</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <Button onClick={updatePassword} variant="outline" size="sm">Alterar</Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: notifications */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-display font-bold">Notificações</p>
                    <p className="text-[11px] text-muted-foreground">Lembretes, conquistas e comunicados</p>
                  </div>
                </div>
                <Switch checked={notif} onCheckedChange={(v) => { setNotif(v); supabase.from("profiles").update({ notificacoes_ativas: v }).eq("id", profile.id).then(() => refreshProfile()); }} />
              </div>
            </section>

            {/* Section: restricoes */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><Utensils className="h-4 w-4 text-primary" /> Restrições alimentares</h3>
              <div className="grid grid-cols-2 gap-2">
                {RESTRICOES.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background p-2.5 text-sm">
                    <Checkbox checked={restricoes.includes(r)} onCheckedChange={(v) => toggleRestricao(r, !!v)} />
                    <span className="capitalize">{r}</span>
                  </label>
                ))}
              </div>
              <Button onClick={saveProfile} className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90">Salvar restrições</Button>
            </section>

            {/* Section: peso */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><Scale className="h-4 w-4 text-primary" /> Atualizar peso</h3>
              <div className="flex gap-2">
                <Input type="number" step="0.1" value={newPeso} onChange={(e) => setNewPeso(e.target.value)} placeholder="Peso atual em kg" />
                <Button onClick={logPeso} className="bg-primary text-primary-foreground hover:bg-primary/90">Registrar</Button>
              </div>
            </section>

            {/* Section: support */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-bold"><LifeBuoy className="h-4 w-4 text-primary" /> Suporte</h3>
              <div className="grid grid-cols-2 gap-2">
                <a href="mailto:suporte@letponto.com" className="rounded-lg border border-border bg-background p-3 text-center text-xs hover:bg-muted">
                  ✉️ E-mail
                </a>
                <a href="https://wa.me/5511999999999" target="_blank" rel="noreferrer" className="rounded-lg border border-border bg-background p-3 text-center text-xs hover:bg-muted">
                  💬 WhatsApp
                </a>
              </div>
            </section>

            {/* Logout */}
            <Button variant="ghost" onClick={() => setConfirmLogout(true)} className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sair da conta
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription>Você precisará entrar novamente para acessar o app.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await signOut(); nav("/auth", { replace: true }); }} className="bg-destructive hover:bg-destructive/90">Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
