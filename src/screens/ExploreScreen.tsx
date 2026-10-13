import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';

import MainSafe from '@/components/mainsafe';
import ProductCard from '@/components/productcard';
import { motors } from '@/database/motors';

export default function ExploreScreen() {
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
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  list: { padding: 24, paddingTop: 64, gap: 12 },
  name: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  type: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },
  price: { color: '#ffffff', fontSize: 15, fontWeight: '700', marginTop: 8 },
});