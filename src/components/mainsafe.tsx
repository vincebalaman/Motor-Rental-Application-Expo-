import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MainSafeProps {
  children?: React.ReactNode;
}

export default function MainSafe({ children }: MainSafeProps) {
  return (  
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3efe6",
  }
});