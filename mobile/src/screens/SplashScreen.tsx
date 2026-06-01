import { useEffect, useRef } from "react";
import { View, Image, Animated, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

const logo = require("@/assets/images/letclub-logo-light.png");

type Nav = NativeStackNavigationProp<RootStackParamList, "Splash">;

export default function SplashScreen() {
  const nav = useNavigation<Nav>();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        nav.replace("Auth");
      });
    }, 1400);

    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      style={{ opacity }}
      className="flex-1 items-center justify-center bg-secondary"
    >
      <Image
        source={logo}
        className="w-[60%] max-w-[280px]"
        resizeMode="contain"
      />
      <View className="mt-6 flex-row items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className={`h-2 w-2 rounded-full ${
              i === 0 ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </View>
    </Animated.View>
  );
}
