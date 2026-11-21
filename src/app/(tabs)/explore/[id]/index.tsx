import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import { dailyPrice } from '@/components/catalog-card';
import { useAuth } from '@/context/AuthContext';
import { useMotorInventory } from '@/context/MotorContext';
import { inventoryErrorMessage } from '@/services/inventory';

export default function MotorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { motors, deleteMotor } = useMotorInventory();
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
        <Pressable onPress={() => router.replace('/explore')} accessibilityRole="button" style={styles.backButton}>
          <Text style={styles.back}>← <Text style={styles.backLabel}>Explore</Text></Text>
        </Pressable>

        {motor ? (
          <View style={styles.content}>
            <View style={styles.productCard}>
              <View style={styles.imageFrame}>
                {motor.imageUrl ? <Image
                  source={{ uri: motor.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                  accessibilityLabel={`${motor.name} image`}
                /> : <View style={styles.imagePlaceholder}><Text style={styles.notFoundText}>Image unavailable</Text></View>}
                <View style={styles.photoLabel}><Text style={styles.photoLabelText}>MOTOR DETAILS</Text></View>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.type} numberOfLines={2}>{motor.type}</Text>
                <Text style={styles.title}>{motor.name}</Text>
                <View style={styles.pricePanel}>
                  <Text style={styles.priceLabel}>DAILY RENTAL RATE</Text>
                  <Text style={styles.price}>{dailyPrice(motor.price)}<Text style={styles.perDay}> / day</Text></Text>
                </View>
                <View style={styles.divider} />
                <Text style={styles.descriptionLabel}>ABOUT THIS RIDE</Text>
                <Text style={styles.description}>{motor.description}</Text>
              </View>
            </View>

            {user?.role === 'client' && <View style={styles.confirmation}>
              <View style={styles.confirmationCopy}>
                <Text style={styles.confirmationTitle}>Ready to plan your ride?</Text>
                <Text style={styles.confirmationText}>Choose your dates and review the total. Your request will be sent for admin approval.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Request booking for ${motor.name}`}
                onPress={() => router.push({ pathname: '/explore/[id]/book', params: { id: motor.id } })}
                style={({ pressed }) => [styles.bookingButton, pressed && styles.bookingButtonPressed]}
              >
                <Text style={styles.bookingButtonText}>Request booking</Text>
                <Text style={styles.bookingArrow}>→</Text>
              </Pressable>
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
                <Text style={styles.confirmationText}>This removes the motor from the catalog, including after restarting the app.</Text>
                {deleteError && <Text accessibilityRole="alert" style={styles.deleteError}>{deleteError}</Text>}
                <Pressable accessibilityRole="button" disabled={isDeleting} onPress={handleDelete} style={[styles.deleteButton, isDeleting && styles.disabledButton]}>
                  <Text style={styles.deleteButtonText}>{isDeleting ? 'Deleting…' : 'Confirm delete'}</Text>
                </Pressable>
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
  container: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 36, maxWidth: 780, width: '100%', alignSelf: 'center', gap: 12 },
  backButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 },
  back: { color: '#21484a', fontSize: 19, fontWeight: '700' },
  backLabel: { fontSize: 15 },
  content: { gap: 16, paddingBottom: 20 },
  productCard: { overflow: 'hidden', backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#e1e2d9', borderRadius: 22 },
  imageFrame: { width: '100%', aspectRatio: 1.55, maxHeight: 380, backgroundColor: '#e2e9e3' },
  image: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoLabel: { position: 'absolute', left: 16, bottom: 16, borderRadius: 18, backgroundColor: '#faf8f2', paddingHorizontal: 12, paddingVertical: 8 },
  photoLabelText: { color: '#21484a', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  cardContent: { padding: 20, gap: 10 },
  type: { color: '#526e65', fontSize: 12, lineHeight: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#183334', fontSize: 30, lineHeight: 37, fontWeight: '800', flexShrink: 1 },
  pricePanel: { alignSelf: 'flex-start', marginTop: 5, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#e6eadd' },
  priceLabel: { color: '#526e65', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  price: { color: '#21484a', fontSize: 24, lineHeight: 32, fontWeight: '800', marginTop: 2 },
  perDay: { color: '#526e65', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e1e2d9', marginVertical: 7 },
  descriptionLabel: { color: '#526e65', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  description: { color: '#425752', fontSize: 15, lineHeight: 24 },
  confirmation: { gap: 16, padding: 20, backgroundColor: '#e6eadd', borderRadius: 20 },
  confirmationCopy: { gap: 7 },
  confirmationTitle: { color: '#183334', fontSize: 19, lineHeight: 25, fontWeight: '800' },
  confirmationText: { color: '#526e65', fontSize: 14, lineHeight: 22 },
  bookingButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 18, borderRadius: 14, backgroundColor: '#21484a' },
  bookingButtonPressed: { opacity: 0.82 },
  bookingButtonText: { color: '#faf8f2', fontSize: 16, fontWeight: '800' },
  bookingArrow: { color: '#faf8f2', fontSize: 20, fontWeight: '700' },
  deleteError: { color: '#991b1b', fontSize: 14, lineHeight: 21 },
  cancelButton: { alignItems: 'center', padding: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  editButton: { flexGrow: 1, flexBasis: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: '#21484a', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 16 },
  editButtonText: { color: '#faf8f2', fontSize: 15, fontWeight: '700' },
  deleteButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7f1d1d', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 16 },
  deleteButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
  notFound: { flex: 1, justifyContent: 'center', gap: 10, padding: 24, backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#e1e2d9', borderRadius: 20 },
  notFoundTitle: { color: '#183334', fontSize: 22, lineHeight: 29, fontWeight: '800' },
  notFoundText: { color: '#64756f', fontSize: 15, lineHeight: 23 },
});