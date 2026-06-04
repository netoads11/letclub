import { Alert } from "react-native";

export const showToast = (_type: "success" | "error", text: string) => {
  Alert.alert("", text);
};
