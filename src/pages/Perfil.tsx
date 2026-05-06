import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, MoreHorizontal, LogOut, Lock, Mail, Bell, Utensils, Scale, LifeBuoy, User, Camera } from "lucide-react";
import iconSelo from "@/assets/icons/selo.svg";
import iconAlvo from "@/assets/icons/alvo.svg";
import iconFogoSimples from "@/assets/icons/fogo-simples.svg";
import iconFogoDuplo from "@/assets/icons/fogo-duplo.svg";
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
import { AppShell } from "@/components/AppShell";

const RESTRICOES = ["vegetariana", "lactose", "gluten", "gestante"];

function WeightBarChart({ data }: { data: { data: string; peso: number; meta: number }[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.peso, d.meta)), 1);
  return (
    <div>
      <div className="flex h-40 items-end justify-between gap-2">
        {data.map((d, i) => {
          const pesoH = (d.peso / maxVal) * 100;
          const metaH = (d.meta / maxVal) * 100;
          return (
            <div key={i} className="relative flex h-full flex-1 items-end justify-center">
              {/* meta (listrada/fantasma) */}
              <div
                className="absolute right-[18%] w-[28%] rounded-full opacity-60"
                style={{
                  height: `${metaH}%`,
                  backgroundImage:
                    "repeating-linear-gradient(0deg, hsl(var(--secondary) / 0.35) 0 3px, transparent 3px 6px)",
                }}
              />
              {/* peso real */}
              <div
                className="absolute left-[18%] w-[28%] rounded-full bg-primary"
                style={{ height: `${pesoH}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center">
            <p className="font-display text-sm font-bold text-foreground">{d.peso} kg</p>
            <p className="text-[10px] text-muted-foreground">{d.data}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const handle = "@" + (profile.email?.split("@")[0] || (profile.full_name || "voce").split(" ")[0].toLowerCase()).slice(0, 14);
  const metaPeso = Number(profile.meta_peso ?? 0);
  const chartData = pesos.slice(-6).map((p) => ({
    data: p.data,
    peso: p.peso,
    meta: metaPeso || Math.max(p.peso, 1),
  }));
  const now = new Date();
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const dataAgora = `${now.getDate()} de ${meses[now.getMonth()]}, ${String(now.getHours()).padStart(2,"0")}h${String(now.getMinutes()).padStart(2,"0")}`;

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
    <AppShell>
      <header className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} aria-label="Voltar" className="-ml-1 p-1">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </button>
          <span className="font-display text-base font-bold text-foreground">{handle}</span>
          <img src={iconSelo} alt="" className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">Seu Perfil</span>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70"
          aria-label="Configurações"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      <div className="mx-auto max-w-md slide-up px-4">
        {/* Avatar */}
        <div className="flex flex-col items-center pt-2">
          <label className="relative cursor-pointer group">
            <div className="h-[140px] w-[140px] overflow-hidden rounded-3xl border-4 border-primary bg-muted">
              {avatarUrl ? (
                <img src={avatarUrl} className="h-full w-full object-cover" alt={profile.full_name} />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-5xl font-bold text-primary">
                  {(profile.full_name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-7 w-7 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <img
              src={iconSelo}
              alt=""
              className="pointer-events-none absolute -bottom-2 -right-2 h-9 w-9 drop-shadow-md"
            />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </label>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
            {profile.full_name || "Aluna"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Membra Fundadora</p>
        </div>

        {/* Card pesos + gráfico */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="pr-3">
              <p className="text-xs text-muted-foreground">Peso inicial</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {profile.peso_inicial ?? "—"} <span className="text-sm font-medium text-muted-foreground">kg</span>
              </p>
            </div>
            <div className="px-3">
              <p className="text-xs text-muted-foreground">Peso Atual</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {profile.peso_atual ?? "—"} <span className="text-sm font-medium text-muted-foreground">kg</span>
              </p>
            </div>
            <div className="pl-3">
              <p className="text-xs text-muted-foreground">Meta</p>
              <div className="mt-1 flex items-center gap-1.5">
                <img src={iconAlvo} alt="" className="h-5 w-5" />
                <p className="font-display text-2xl font-bold text-foreground">
                  {profile.meta_peso ?? "—"} <span className="text-sm font-medium text-muted-foreground">kg</span>
                </p>
              </div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="mt-5">
              <WeightBarChart data={chartData} />
            </div>
          )}
        </div>

        {/* Sua Jornada */}
        <div className="mt-4 flex items-center justify-between rounded-3xl bg-primary/15 p-5">
          <div>
            <div className="flex items-center gap-2">
              <img src={iconFogoSimples} alt="" className="h-4 w-auto" />
              <span className="text-sm font-medium text-foreground/80">Sua Jornada</span>
            </div>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">
              {profile.streak_atual} Dias Seguidos
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Recorde: <span className="font-bold text-foreground">{profile.streak_recorde} dias</span>
            </p>
          </div>
          <div className="flex items-center gap-2 pr-1">
            <img src={iconSelo} alt="" className="h-7 w-7" />
            <div>
              <p className="text-xs text-muted-foreground">Meta</p>
              <p className="font-display text-2xl font-bold text-foreground">15 Dias</p>
            </div>
          </div>
        </div>

        {/* Calorias do dia */}
        <div className="mt-4 flex items-center justify-between rounded-3xl border border-border bg-card p-5 shadow-card">
          <div>
            <p className="font-display text-base font-bold text-foreground">Calorias do dia</p>
            <div className="mt-2 flex items-center gap-2">
              <img src={iconFogoSimples} alt="" className="h-5 w-auto" />
              <p className="font-display text-2xl font-bold text-foreground">
                0 <span className="text-sm font-medium text-muted-foreground">kcal</span>
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{dataAgora}</p>
          </div>
          <div className="flex items-center gap-3">
            <img src={iconFogoDuplo} alt="" className="h-10 w-auto" />
            <div>
              <p className="text-xs text-muted-foreground">Meta do dia</p>
              <p className="font-display text-2xl font-bold text-foreground">
                1.600 <span className="text-sm font-medium text-muted-foreground">kcal</span>
              </p>
            </div>
          </div>
        </div>

        <div>
          {/* Badges */}
          <p className="mt-6 mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
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
                      ? "border-primary/30 bg-card"
                      : "border-border bg-card opacity-30"
                  }`}
                >
                  <div className={`text-[32px] leading-none ${!u && "grayscale"}`}>{b.icone}</div>
                  <p className="mt-2 font-display text-[11px] text-foreground">{b.nome}</p>
                  {!u && (
                    <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* SETTINGS BOTTOM SHEET */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-0"
        >
          {/* Handle bar */}
          <div className="sticky top-0 z-10 flex justify-center bg-card pb-2 pt-3">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>
          <div className="px-4 pb-8">
            <h2 className="mb-4 font-display text-xl font-bold text-foreground">Configurações</h2>
            <div className="space-y-3">
              {/* Section: profile */}
              <section className="rounded-2xl border border-border bg-background p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-foreground"><User className="h-4 w-4 text-primary" /> Perfil</h3>
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
              <section className="rounded-2xl border border-border bg-background p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-foreground"><Mail className="h-4 w-4 text-primary" /> E-mail e senha</h3>
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
              <section className="rounded-2xl border border-border bg-background p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-display font-bold text-foreground">Notificações</p>
                      <p className="text-[11px] text-muted-foreground">Lembretes, conquistas e comunicados</p>
                    </div>
                  </div>
                  <Switch checked={notif} onCheckedChange={(v) => { setNotif(v); supabase.from("profiles").update({ notificacoes_ativas: v }).eq("id", profile.id).then(() => refreshProfile()); }} />
                </div>
              </section>

              {/* Section: restricoes */}
              <section className="rounded-2xl border border-border bg-background p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-foreground"><Utensils className="h-4 w-4 text-primary" /> Restrições alimentares</h3>
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
              <section className="rounded-2xl border border-border bg-background p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-foreground"><Scale className="h-4 w-4 text-primary" /> Atualizar peso</h3>
                <div className="flex gap-2">
                  <Input type="number" step="0.1" value={newPeso} onChange={(e) => setNewPeso(e.target.value)} placeholder="Peso atual em kg" />
                  <Button onClick={logPeso} className="bg-primary text-primary-foreground hover:bg-primary/90">Registrar</Button>
                </div>
              </section>

              {/* Section: support */}
              <section className="rounded-2xl border border-border bg-background p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-foreground"><LifeBuoy className="h-4 w-4 text-primary" /> Suporte</h3>
                <a href="mailto:suporte@leteponto.com.br" className="block rounded-lg border border-border bg-background p-3 text-center text-xs hover:bg-muted">
                  ✉️ suporte@leteponto.com.br
                </a>
              </section>

              {/* Logout */}
              <Button variant="ghost" onClick={() => setConfirmLogout(true)} className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sair da conta
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>


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
    </AppShell>
  );
}
