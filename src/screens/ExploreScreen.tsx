import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import ProductCard from '@/components/productcard';
import { useAuth } from '@/context/AuthContext';
import { useMotorInventory } from '@/context/MotorContext';

export default function ExploreScreen() {
  const { motors, refreshing, refreshError, refresh } = useMotorInventory();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const { user } = useAuth();

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
        refreshing={refreshing}
        onRefresh={refresh}
        ListHeaderComponent={<View>
          {refreshError && <Text accessibilityRole="alert" style={styles.emptyText}>{refreshError}</Text>}
          {user?.role === 'admin' && <Pressable accessibilityRole="button" style={styles.importButton} onPress={() => router.push('/explore/import')}>
            <Text style={styles.importText}>Import motors from this device</Text>
          </Pressable>}
        </View>}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProductCard
            onPress={() =>
              router.push({
                pathname: '/(tabs)/explore/[id]',
                params: { id: String(item.id) },
              })
            }
            accessibilityLabel={`View ${item.name} details`}
          >
            {item.imageUrl
              ? <Image source={{ uri: item.imageUrl }} style={styles.image} accessibilityLabel={`${item.name} image`} />
              : <View style={styles.image}><Text style={styles.emptyText}>Image unavailable</Text></View>}
            <View style={styles.cardContent}>
              <View style={styles.motorDetails}>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <Text style={styles.cardArrow} accessibilityElementsHidden>
                ›
              </Text>
            </View>
          </ProductCard>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No shared motors yet. An administrator can add the first listing. Pull down to refresh.</Text>}
      />
      {user?.role === 'admin' && <Pressable style={styles.fab} onPress={handleFabPress} accessibilityRole="button" accessibilityLabel="Add motor">
        <Text style={styles.fabText}>+</Text>
      </Pressable>}
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  importButton: { padding: 16, borderRadius: 10, backgroundColor: '#e2ebe8', marginBottom: 16 },
  importText: { color: '#21484a', fontSize: 14, fontWeight: '700' },
  list: { padding: 24, paddingTop: 64, gap: 12 },
  image: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#1e293b' },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  motorDetails: { flex: 1 },
  name: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  cardArrow: { color: '#cbd5e1', fontSize: 28, lineHeight: 28 },
  type: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },
  price: { color: '#ffffff', fontSize: 15, fontWeight: '700', marginTop: 8 },
  hideButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: '#7f1d1d' },
  hideButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  emptyText: { color: '#64748b', fontSize: 16, textAlign: 'center', marginTop: 32 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28, // Perfect circle (half of width/height)
    backgroundColor: '#21484a',
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
  fabText: { color: '#ffffff', fontSize: 24, fontWeight: '600' },
});