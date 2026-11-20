import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import ProductCard from '@/components/productcard';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
import { useBookingCart } from '@/context/BookingContext';
import { useMotorInventory } from '@/context/MotorContext';
import { inventoryErrorMessage } from '@/services/inventory';

export default function MotorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { motors, deleteMotor } = useMotorInventory();
  const { addMotor, removeMotor, hasMotor } = useBookingCart();
  const motor = motors.find((m) => m.id === (Array.isArray(id) ? id[0] : id));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleting = useRef(false);

  const handleDelete = async () => {
    if (!motor || deleting.current) return;
    deleting.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMotor(motor.id, motor.updatedAt);
      router.replace('/(tabs)/explore');
    } catch (error) {
      setDeleteError(inventoryErrorMessage(error));
    } finally {
      deleting.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <MainSafe>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.replace('/explore')} accessibilityRole="button">
          <Text style={styles.back}>← Explore</Text>
        </TouchableOpacity>

        {motor ? (
          <View style={styles.content}>
            <Text style={styles.eyebrow}>MOTOR DETAILS</Text>
            <ProductCard>
              {motor.imageUrl ? <Image
                source={{ uri: motor.imageUrl }}
                style={styles.image}
                accessibilityLabel={`${motor.name} image`}
              /> : <View style={styles.image}><Text style={styles.notFoundText}>Image unavailable</Text></View>}
              <View style={styles.cardContent}>
                <Text style={styles.type}>{motor.type}</Text>
                <Text style={styles.title}>{motor.name}</Text>
                <Text style={styles.price}>₱{motor.price} <Text style={styles.perDay}>/ day</Text></Text>
                <View style={styles.divider} />
                <Text style={styles.description}>{motor.description}</Text>
              </View>
            </ProductCard>

            {user?.role === 'client' && <View style={styles.bookingActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${hasMotor(motor.id) ? 'Remove' : 'Add'} ${motor.name} ${hasMotor(motor.id) ? 'from' : 'to'} booking`}
                accessibilityState={{ selected: hasMotor(motor.id) }}
                onPress={() => hasMotor(motor.id) ? removeMotor(motor.id) : addMotor(motor)}
                style={[styles.bookingButton, hasMotor(motor.id) && styles.bookingButtonSelected]}
              >
                <Text style={[styles.bookingButtonText, hasMotor(motor.id) && styles.bookingButtonSelectedText]}>{hasMotor(motor.id) ? '✓ Added to booking' : '＋ Add to booking'}</Text>
              </Pressable>
              {hasMotor(motor.id) && <Pressable accessibilityRole="button" onPress={() => router.navigate('/bookings')} style={styles.viewBookingButton}>
                <Text style={styles.viewBookingText}>View booking</Text>
              </Pressable>}
            </View>}

            {user?.role === 'admin' && <View style={styles.actions}>
              <Pressable
                style={styles.editButton}
                disabled={isDeleting}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/explore/[id]/edit',
                    params: { id: String(motor.id) },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={styles.editButtonText}>Edit motor</Text>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() => { setConfirmingDelete(true); setDeleteError(null); }}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${motor.name}`}
                accessibilityHint="Asks for confirmation before deleting this motor."
              >
                <Text style={styles.deleteButtonText}>Delete motor</Text>
              </Pressable>
            </View>}
            {user?.role === 'admin' && confirmingDelete && (
              <View style={styles.confirmation}>
                <Text style={styles.confirmationTitle}>Delete {motor.name}?</Text>
                <Text style={styles.notFoundText}>This removes the motor from the catalog, including after restarting the app.</Text>
                {deleteError && <Text accessibilityRole="alert" style={styles.deleteError}>{deleteError}</Text>}
                <SubmitButton title="CONFIRM DELETE" onPress={handleDelete} isSubmitting={isDeleting} style={styles.confirmDeleteButton} />
                <Pressable onPress={() => setConfirmingDelete(false)} disabled={isDeleting} accessibilityRole="button" style={styles.cancelButton}>
                  <Text style={styles.back}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>Motor not available</Text>
            <Text style={styles.notFoundText}>This motor may have been deleted from the catalog.</Text>
          </View>
        )}
      </ScrollView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  confirmDeleteButton: { backgroundColor: '#7f1d1d' },
  confirmation: { gap: 12, padding: 20, backgroundColor: '#ffffff', borderRadius: 12 },
  confirmationTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },
  deleteError: { color: '#991b1b', fontSize: 14, lineHeight: 21 },
  cancelButton: { alignItems: 'center', padding: 12 },
  container: { flexGrow: 1, padding: 24, paddingTop: 32 },
  back: { color: '#21484a', fontSize: 16, fontWeight: '700' },
  content: { gap: 16, paddingTop: 28, paddingBottom: 24 },
  eyebrow: { color: '#21484a', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  image: { width: '100%', height: 240, borderRadius: 12, backgroundColor: '#1e293b' },
  cardContent: { paddingTop: 18 },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  type: { color: '#94a3b8', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  price: { color: '#93c5fd', fontSize: 22, fontWeight: '800', marginTop: 14 },
  perDay: { color: '#cbd5e1', fontSize: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 18 },
  description: { color: '#cbd5e1', fontSize: 16, lineHeight: 25 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  bookingActions: { gap: 10 },
  bookingButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#21484a', borderRadius: 12, paddingHorizontal: 16 },
  bookingButtonText: { color: '#faf8f2', fontSize: 15, fontWeight: '800' },
  bookingButtonSelected: { backgroundColor: '#e2e9df' },
  bookingButtonSelectedText: { color: '#21484a' },
  viewBookingButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  viewBookingText: { color: '#21484a', fontSize: 14, fontWeight: '700' },
  editButton: { flex: 1, alignItems: 'center', backgroundColor: '#21484a', borderRadius: 12, paddingVertical: 15 },
  editButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  deleteButton: { flex: 1, alignItems: 'center', backgroundColor: '#7f1d1d', borderRadius: 12, paddingVertical: 15 },
  deleteButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  notFoundTitle: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  notFoundText: { color: '#64748b', fontSize: 15, textAlign: 'center' },
});