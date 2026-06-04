import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, Sparkles, Bell } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/lib/toast";

const dificuldades = [
  { v: "inchaco", l: "Inchaço" },
  { v: "intestino", l: "Intestino preso" },
  { v: "energia", l: "Falta de energia" },
  { v: "emagrecimento", l: "Emagrecimento" },
  { v: "outro", l: "Outro" },
];

export default function OnboardingScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [meta, setMeta] = useState("");
  const [dif, setDif] = useState("emagrecimento");
  const [busy, setBusy] = useState(false);

  const finish = async (notif: boolean) => {
    if (!user) return;
    setBusy(true);
    const pesoN = parseFloat(peso);
    const alturaN = parseFloat(altura);
    const metaN = parseFloat(meta);
    if (!pesoN || !alturaN || !metaN) {
      showToast("error", "Preencha todos os campos");
      setStep(1);
      setBusy(false);
      return;
    }
    console.log("[ONBOARDING] updating profile:", { pesoN, alturaN, metaN, dif, notif, userId: user.id });
    const { error, data } = await supabase
      .from("profiles")
      .update({
        peso_inicial: pesoN,
        peso_atual: pesoN,
        altura: alturaN,
        meta_peso: metaN,
        principal_dificuldade: dif as any,
        onboarding_completed: true,
        challenge_start_date: new Date().toISOString().slice(0, 10),
        notificacoes_ativas: notif,
      })
      .eq("id", user.id)
      .select();
    console.log("[ONBOARDING] profile update result:", JSON.stringify({ error, data }));

    if (error) {
      console.log("[ONBOARDING] profile error:", error.message, error.details, error.hint, error.code);
      setBusy(false);
      return showToast("error", error.message);
    }

    const { error: pesoErr } = await supabase.from("pesos_historico").insert({
      user_id: user.id,
      peso: pesoN,
      registrado_em: new Date().toISOString().slice(0, 10),
    });
    console.log("[ONBOARDING] peso insert:", JSON.stringify({ error: pesoErr }));

    setBusy(false);
    await refreshProfile();
    console.log("[ONBOARDING] done!");
    showToast("success", "Tudo certo! Bora começar!");
  };

  const firstName = (profile?.full_name || "").split(" ")[0] || "linda";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="px-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress dots */}
        <View className="mb-8 mt-10 flex-row items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${
                i === step ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </View>

        {step === 0 && (
          <View className="flex-1 items-center justify-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/15">
              <Heart size={48} color="#BFDB1E" />
            </View>
            <Text className="mt-6 text-center text-3xl font-bold text-foreground">
              Bem-vinda, {firstName}!
            </Text>
            <Text className="mt-3 max-w-[280px] text-center text-sm text-muted-foreground">
              Sou a Let. Nos próximos 15 dias, vou te guiar em uma jornada de
              hábitos saudáveis, energia e autocuidado. Vamos juntas?
            </Text>
            <TouchableOpacity
              onPress={() => setStep(1)}
              activeOpacity={0.9}
              className="mt-10 w-full items-center rounded-xl bg-primary py-3.5"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                Começar minha jornada
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View className="flex-1">
            <Sparkles size={32} color="#BFDB1E" />
            <Text className="mt-3 text-2xl font-bold text-foreground">
              Conta um pouco sobre você
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Esses dados ajudam a personalizar seu desafio.
            </Text>

            <View className="mt-6 gap-4">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1.5 text-sm font-medium text-foreground">
                    Peso atual (kg)
                  </Text>
                  <TextInput
                    value={peso}
                    onChangeText={setPeso}
                    placeholder="65.5"
                    placeholderTextColor="#888888"
                    keyboardType="decimal-pad"
                    className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1.5 text-sm font-medium text-foreground">
                    Altura (cm)
                  </Text>
                  <TextInput
                    value={altura}
                    onChangeText={setAltura}
                    placeholder="165"
                    placeholderTextColor="#888888"
                    keyboardType="number-pad"
                    className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  />
                </View>
              </View>

              <View>
                <Text className="mb-1.5 text-sm font-medium text-foreground">
                  Meta de peso (kg)
                </Text>
                <TextInput
                  value={meta}
                  onChangeText={setMeta}
                  placeholder="60"
                  placeholderTextColor="#888888"
                  keyboardType="decimal-pad"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
              </View>

              <View>
                <Text className="mb-1.5 text-sm font-medium text-foreground">
                  Sua principal dificuldade hoje
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {dificuldades.map((d) => (
                    <TouchableOpacity
                      key={d.v}
                      onPress={() => setDif(d.v)}
                      activeOpacity={0.9}
                      className={`rounded-xl border p-3 ${
                        dif === d.v
                          ? "border-primary bg-primary"
                          : "border-border bg-card"
                      }`}
                      style={{ width: "48%" }}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          dif === d.v ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {d.l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setStep(2)}
              disabled={!peso || !altura || !meta}
              activeOpacity={0.9}
              className={`mt-8 items-center rounded-xl bg-primary py-3.5 ${
                !peso || !altura || !meta ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                Continuar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View className="flex-1 items-center justify-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/15">
              <Bell size={48} color="#BFDB1E" />
            </View>
            <Text className="mt-6 text-center text-2xl font-bold text-foreground">
              Quer receber lembretes diários?
            </Text>
            <Text className="mt-3 max-w-[280px] text-center text-sm text-muted-foreground">
              Vou te lembrar das missões, chá da noite e conquistas. Você pode
              mudar isso depois.
            </Text>
            <View className="mt-10 w-full gap-3">
              <TouchableOpacity
                onPress={() => finish(true)}
                disabled={busy}
                activeOpacity={0.9}
                className={`items-center rounded-xl bg-primary py-3.5 ${
                  busy ? "opacity-50" : ""
                }`}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-primary-foreground">
                    Ativar notificações
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => finish(false)}
                disabled={busy}
                className="items-center rounded-xl py-3.5"
              >
                <Text className="text-sm text-muted-foreground">
                  Agora não
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
