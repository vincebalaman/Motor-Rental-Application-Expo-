import { Pressable, StyleSheet, View } from 'react-native';

interface ProductCardProps {
  children?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export default function ProductCard({ children, onPress, accessibilityLabel }: ProductCardProps) {
  if (onPress) {
    return (
      <Pressable
        style={styles.card}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0f172a', 
        borderRadius: 16, 
        padding: 20
    }
})
