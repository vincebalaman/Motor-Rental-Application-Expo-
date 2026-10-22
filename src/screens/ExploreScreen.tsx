import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import ProductCard from '@/components/productcard';
import { useMotorInventory } from '@/context/MotorContext';

export default function ExploreScreen() {
  const { motors } = useMotorInventory();
  const [hiddenMotorIds, setHiddenMotorIds] = useState<Set<number>>(() => new Set());

  const handleFabPress = () => {
    router.push({
      pathname: '/(tabs)/explore/[id]/create',
      params: { id: 'new' },
    })
  };

  const handleHideMotor = (motorId: number) => {
    setHiddenMotorIds((currentIds) => new Set(currentIds).add(motorId));
  };

  return (
    <MainSafe>
      <FlatList
        data={motors.filter((motor) => !hiddenMotorIds.has(motor.id))}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProductCard>
            <Image source={{ uri: item.imageUrl }} style={styles.image} accessibilityLabel={`${item.name} image`} />
            <View style={styles.cardContent}>
              <TouchableOpacity
                style={styles.motorDetails}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/explore/[id]',
                    params: { id: String(item.id) },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.type}>{item.type}</Text>
                <Text style={styles.price}>₱{item.price} / day</Text>
              </TouchableOpacity>
              <Pressable
                style={styles.hideButton}
                onPress={() => handleHideMotor(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Hide ${item.name}`}
                accessibilityHint="Removes this motor from the Explore list until you leave this screen."
              >
                <Text style={styles.hideButtonText}>Hide</Text>
              </Pressable>
            </View>
          </ProductCard>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No motors to show.</Text>}
      />
      <Pressable style={styles.fab} onPress={handleFabPress} accessibilityRole="button" accessibilityLabel="Add motor">
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  list: { padding: 24, paddingTop: 64, gap: 12 },
  image: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#1e293b' },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  motorDetails: { flex: 1 },
  name: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
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
  fabText: { color: '#ffffff', fontSize: 24, fontWeight: '600' },
});