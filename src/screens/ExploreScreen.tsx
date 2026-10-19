import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, TouchableOpacity } from 'react-native';

import MainSafe from '@/components/mainsafe';
import ProductCard from '@/components/productcard';
import { motors } from '@/database/motors';

export default function ExploreScreen() {
  const handleFabPress = () => {
    router.push({
      pathname: '/(tabs)/explore/[id]/create',
      params: { id: 'new' },
    })
  };

  return (
    <MainSafe>
      <FlatList
        data={motors}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProductCard>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/explore/[id]',
                  params: { id: String(item.id) },
                })
              }
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.price}>₱{item.price} / day</Text>
            </TouchableOpacity>
          </ProductCard>
        )}
      />
      <Pressable 
          style={({ pressed }) => [
            styles.fab
          ]} 
          onPress={handleFabPress}
        >
          <Text>+</Text>
      </Pressable>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  list: { padding: 24, paddingTop: 64, gap: 12 },
  name: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  type: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },
  price: { color: '#ffffff', fontSize: 15, fontWeight: '700', marginTop: 8 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28, // Perfect circle (half of width/height)
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    // Android Shadow
    elevation: 5,
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});