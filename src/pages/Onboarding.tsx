import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Heart, Sparkles, Bell } from "lucide-react";

const dificuldades = [
  { v: "inchaco", l: "Inchaço" },
  { v: "intestino", l: "Intestino preso" },
  { v: "energia", l: "Falta de energia" },
  { v: "emagrecimento", l: "Emagrecimento" },
  { v: "outro", l: "Outro" },
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [meta, setMeta] = useState("");
  const [dif, setDif] = useState<string>("emagrecimento");
  const [busy, setBusy] = useState(false);

  const finish = async (notif: boolean) => {
    if (!user) return;
    setBusy(true);
    const pesoN = parseFloat(peso);
    const alturaN = parseFloat(altura);
    const metaN = parseFloat(meta);
    if (!pesoN || !alturaN || !metaN) {
      toast.error("Preencha todos os campos");
      setStep(1);
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("profiles").update({
      peso_inicial: pesoN,
      peso_atual: pesoN,
      altura: alturaN,
      meta_peso: metaN,
      principal_dificuldade: dif as any,
      onboarding_completed: true,
      challenge_start_date: new Date().toISOString().slice(0, 10),
      notificacoes_ativas: notif,
    }).eq("id", user.id);

    // initial weight history
    await supabase.from("pesos_historico").insert({ user_id: user.id, peso: pesoN, registrado_em: new Date().toISOString().slice(0, 10) });

    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Tudo certo! Bora começar 💚");
    nav("/home", { replace: true });
  };

  const firstName = (profile?.full_name || "").split(" ")[0] || "linda";

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-2 bg-muted"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center slide-up">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 glow-primary">
              <Heart className="h-12 w-12 text-primary" />
            </div>
            <h1 className="mt-6 font-display text-3xl font-bold">Bem-vinda, {firstName}! 💚</h1>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Sou a Let. Nos próximos 15 dias, vou te guiar em uma jornada de hábitos saudáveis, energia e autocuidado. Vamos juntas?
            </p>
            <Button onClick={() => setStep(1)} className="mt-10 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Começar minha jornada
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-1 flex-col slide-up">
            <Sparkles className="h-8 w-8 text-primary" />
            <h2 className="mt-3 font-display text-2xl font-bold">Conta um pouco sobre você</h2>
            <p className="mt-1 text-sm text-muted-foreground">Esses dados ajudam a personalizar seu desafio.</p>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Peso atual (kg)</Label>
                  <Input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="65.5" className="mt-1.5" />
                </div>
                <div>
                  <Label>Altura (cm)</Label>
                  <Input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="165" className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label>Meta de peso (kg)</Label>
                <Input type="number" step="0.1" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="60" className="mt-1.5" />
              </div>
              <div>
                <Label>Sua principal dificuldade hoje</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {dificuldades.map((d) => (
                    <button
                      type="button"
                      key={d.v}
                      onClick={() => setDif(d.v)}
                      className={`rounded-xl border p-3 text-sm transition-colors ${dif === d.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"}`}
                    >{d.l}</button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={() => setStep(2)} disabled={!peso || !altura || !meta} className="mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Continuar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center slide-up">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 glow-primary">
              <Bell className="h-12 w-12 text-primary" />
            </div>
            <h2 className="mt-6 font-display text-2xl font-bold">Quer receber lembretes diários?</h2>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Vou te lembrar das missões, chá da noite e conquistas. Você pode mudar isso depois.
            </p>
            <div className="mt-10 w-full space-y-3">
              <Button onClick={() => finish(true)} disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {busy ? "Salvando..." : "Ativar notificações"}
              </Button>
              <Button onClick={() => finish(false)} variant="ghost" disabled={busy} className="w-full">
                Agora não
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
