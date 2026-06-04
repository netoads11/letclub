import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { z } from "zod";
import { showToast } from "@/lib/toast";

const logo = require("@/assets/images/letclub-logo-dark.png");

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
});

const signUpSchema = signInSchema
  .extend({
    full_name: z.string().trim().min(2, "Informe seu nome").max(100),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "As senhas não conferem",
  });

export default function AuthScreen() {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const showError = (msg: string) =>
    showToast("error", msg);
  const showSuccess = (msg: string) =>
    showToast("success", msg);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      if (resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim()
        );
        if (error) throw error;
        showSuccess("E-mail de recuperação enviado!");
        setResetMode(false);
        return;
      }

      if (tab === "login") {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          showError(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const parsed = signUpSchema.safeParse({
          email,
          password,
          confirm,
          full_name: fullName,
        });
        if (!parsed.success) {
          showError(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        showSuccess("Conta criada! Bem-vinda!");
      }
    } catch (err: any) {
      const msg = err?.message || "Erro ao processar";
      if (msg.includes("Invalid login"))
        showError("E-mail ou senha incorretos");
      else if (msg.includes("already registered"))
        showError("Esse e-mail já está cadastrado");
      else showError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          className="px-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center">
            <Image
              source={logo}
              className="h-12 w-44"
              resizeMode="contain"
            />
            <Text className="mt-2 text-sm text-muted-foreground">
              {resetMode ? "Recuperar senha" : "Sua jornada começa aqui"}
            </Text>
          </View>

          {/* Tab switcher */}
          {!resetMode && (
            <View className="mt-8 flex-row rounded-xl bg-card p-1">
              <TouchableOpacity
                onPress={() => setTab("login")}
                className={`flex-1 items-center rounded-lg py-2.5 ${
                  tab === "login" ? "bg-primary" : ""
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    tab === "login"
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Entrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTab("signup")}
                className={`flex-1 items-center rounded-lg py-2.5 ${
                  tab === "signup" ? "bg-primary" : ""
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    tab === "signup"
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Criar conta
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View className="mt-6 gap-4">
            {tab === "signup" && !resetMode && (
              <View>
                <Text className="mb-1.5 text-sm font-medium text-foreground">
                  Nome completo
                </Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Seu nome"
                  placeholderTextColor="#888888"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  autoCapitalize="words"
                />
              </View>
            )}

            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                E-mail
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                placeholderTextColor="#888888"
                className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {!resetMode && (
              <View>
                <Text className="mb-1.5 text-sm font-medium text-foreground">
                  Senha
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#888888"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  secureTextEntry
                />
              </View>
            )}

            {tab === "signup" && !resetMode && (
              <View>
                <Text className="mb-1.5 text-sm font-medium text-foreground">
                  Confirmar senha
                </Text>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="••••••••"
                  placeholderTextColor="#888888"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  secureTextEntry
                />
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={busy}
              className={`mt-2 items-center rounded-xl bg-primary py-3.5 ${
                busy ? "opacity-50" : ""
              }`}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-sm font-semibold text-primary-foreground">
                  {resetMode
                    ? "Enviar link"
                    : tab === "login"
                    ? "Entrar"
                    : "Criar conta"}
                </Text>
              )}
            </TouchableOpacity>

            {tab === "login" && !resetMode && (
              <TouchableOpacity onPress={() => setResetMode(true)}>
                <Text className="text-center text-xs text-muted-foreground">
                  Esqueci minha senha
                </Text>
              </TouchableOpacity>
            )}
            {resetMode && (
              <TouchableOpacity onPress={() => setResetMode(false)}>
                <Text className="text-center text-xs text-muted-foreground">
                  Voltar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
