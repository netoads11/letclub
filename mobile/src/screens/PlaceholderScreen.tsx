import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlaceholderScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold text-foreground">Em breve</Text>
        <Text className="mt-2 text-sm text-muted-foreground">Tela em desenvolvimento</Text>
      </View>
    </SafeAreaView>
  );
}
