import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';

import MainSafe from '@/components/mainsafe';
import { motors } from '@/database/motors';

export default function ExploreScreen() {
  return (
    <MainSafe>
      <FlatList
        data={motors}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/motor/${item.id}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.type}>{item.type}</Text>
            <Text style={styles.price}>₱{item.price} / day</Text>
          </TouchableOpacity>
        )}
      />
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  list: { padding: 24, paddingTop: 64, gap: 12 },
  card: { backgroundColor: '#0f172a', borderRadius: 16, padding: 20 },
  name: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  type: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },
  price: { color: '#60a5fa', fontSize: 15, fontWeight: '700', marginTop: 8 },
});