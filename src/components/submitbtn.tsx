import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

interface SubmitButtonProps {
  title: string;
  onPress: () => void;
  isSubmitting?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function CustomButton({title, onPress, isSubmitting = false, style,}: SubmitButtonProps) {
  return (
    <Pressable
      style={[styles.button, style, isSubmitting && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isSubmitting}
      accessibilityRole="button"
    >
      {isSubmitting ? (
        <ActivityIndicator color="#f7f2e8" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#21484a",
    minHeight: 54,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#f7f2e8",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.4,
  },
});