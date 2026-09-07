import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";

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