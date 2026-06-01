import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DietaScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg">🍎</Text>
        <Text className="mt-2 text-lg font-semibold text-foreground">Cardapio</Text>
        <Text className="mt-1 text-sm text-muted-foreground">Em desenvolvimento</Text>
      </View>
    </SafeAreaView>
  );
}
