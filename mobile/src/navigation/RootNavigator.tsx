import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/lib/auth";
import { ActivityIndicator, View } from "react-native";
import type { RootStackParamList } from "./types";

import SplashScreen from "@/screens/SplashScreen";
import AuthScreen from "@/screens/AuthScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import MainTabs from "./MainTabs";
import MissoesScreen from "@/screens/MissoesScreen";
import MissaoDetalheScreen from "@/screens/MissaoDetalheScreen";

// Placeholder screens — will be migrated later
import PlaceholderScreen from "@/screens/PlaceholderScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="ResetPassword" component={PlaceholderScreen} />
        </>
      ) : !profile?.onboarding_completed ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Missoes" component={MissoesScreen} />
          <Stack.Screen name="MissaoDetalhe" component={MissaoDetalheScreen} />
          <Stack.Screen name="ReceitaDetalhe" component={PlaceholderScreen} />
          <Stack.Screen name="Perfil" component={PlaceholderScreen} />
          <Stack.Screen name="Notificacoes" component={PlaceholderScreen} />
          <Stack.Screen name="Audios" component={PlaceholderScreen} />
          <Stack.Screen name="Admin" component={PlaceholderScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
