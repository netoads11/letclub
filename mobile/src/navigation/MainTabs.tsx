import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Plus } from "lucide-react-native";
import type { MainTabParamList } from "./types";

import HomeScreen from "@/screens/HomeScreen";
import DietaScreen from "@/screens/DietaScreen";
import ComunidadeScreen from "@/screens/ComunidadeScreen";
import ChatScreen from "@/screens/ChatScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

const iconHome = require("@/assets/icons/nav/home.svg");
const iconHomeActive = require("@/assets/icons/nav/home_active.svg");
const iconDieta = require("@/assets/icons/nav/dieta.svg");
const iconDietaActive = require("@/assets/icons/nav/dieta_active.svg");
const iconComunidade = require("@/assets/icons/nav/comunidade.svg");
const iconComunidadeActive = require("@/assets/icons/nav/comunidade_active.svg");
const iconChat = require("@/assets/icons/nav/chat.svg");
const iconChatActive = require("@/assets/icons/nav/chat_active.svg");

// SVGs won't work with Image in RN — we'll use a simple icon approach for now
// TODO: Convert SVGs to react-native-svg components

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 12,
          borderTopWidth: 1,
          borderTopColor: "#ECECEC",
          backgroundColor: "#FFFFFF",
        },
        tabBarActiveTintColor: "#BFDB1E",
        tabBarInactiveTintColor: "#888888",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: color === "#BFDB1E" ? "#BFDB1E15" : "transparent" }}>
              <Text style={{ color, fontSize: 18 }}>🏠</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Dieta"
        component={DietaScreen}
        options={{
          tabBarLabel: "Cardapio",
          tabBarIcon: ({ color }) => (
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: color === "#BFDB1E" ? "#BFDB1E15" : "transparent" }}>
              <Text style={{ fontSize: 18 }}>🍎</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Publicar"
        component={ComunidadeScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("Comunidade", { openPost: true });
          },
        })}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => (
            <View
              className="items-center justify-center rounded-full bg-primary"
              style={{ width: 52, height: 52, marginTop: -16 }}
            >
              <Plus size={28} color="#fff" />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Comunidade"
        component={ComunidadeScreen}
        options={{
          tabBarLabel: "Comunidade",
          tabBarIcon: ({ color }) => (
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: color === "#BFDB1E" ? "#BFDB1E15" : "transparent" }}>
              <Text style={{ fontSize: 18 }}>👥</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: "Let",
          tabBarIcon: ({ color }) => (
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: color === "#BFDB1E" ? "#BFDB1E15" : "transparent" }}>
              <Text style={{ fontSize: 18 }}>💬</Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
