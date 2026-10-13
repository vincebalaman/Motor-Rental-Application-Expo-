import { StyleSheet, View } from 'react-native';

interface ProductCardProps {
  children?: React.ReactNode;
}

export default function ProductCard({children} : ProductCardProps) {
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
