import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import { MotorFormButton } from '@/components/motor-form';
import { dailyPrice } from '@/components/catalog-card';
import { useAuth } from '@/context/AuthContext';
import { useMotorInventory } from '@/context/MotorContext';
import { inventoryErrorMessage } from '@/services/inventory';

export default function MotorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { motors, loading, error, retry, deleteMotor } = useMotorInventory();
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
        <TouchableOpacity disabled={isDeleting} onPress={() => router.replace('/explore')} accessibilityRole="button">
          <Text style={styles.back}>← Explore</Text>
        </TouchableOpacity>

        {motor ? (
          <View style={styles.content}>
            <Text accessibilityRole="header" style={styles.header}>Motor details</Text>
            <View style={styles.card}>
              {motor.imageUrl ? <Image
                source={{ uri: motor.imageUrl }}
                style={styles.image}
                accessibilityLabel={`${motor.name} image`}
              /> : <View style={styles.image}><Text style={styles.notFoundText}>Image unavailable</Text></View>}
              <View style={styles.cardContent}>
                <Text style={styles.type}>{motor.type}</Text>
                <Text style={styles.title}>{motor.name}</Text>
                <Text style={styles.price}>{dailyPrice(motor.price)} <Text style={styles.perDay}>/ day</Text></Text>
                <View style={styles.divider} />
                <Text style={styles.description}>{motor.description}</Text>
              </View>
            </View>

            {user?.role === 'client' && <View style={styles.confirmation}>
              <Text style={styles.confirmationTitle}>Ready to plan your ride?</Text>
              <Text style={styles.notFoundText}>Choose your dates and review the total. Requests require admin approval.</Text>
              <MotorFormButton title="Request booking" onPress={() => router.push({ pathname: '/explore/[id]/book', params: { id: motor.id } })} />
            </View>}
            {user?.role === 'admin' && <View style={styles.actions}><Text style={styles.sectionTitle}>Manage motor</Text>
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
                accessibilityLabel={`Archive ${motor.name}`}
                accessibilityHint="Asks for confirmation before hiding this motor from the catalog."
              >
                <Text style={styles.deleteButtonText}>Archive motor</Text>
              </Pressable>
            </View>}
            {user?.role === 'admin' && confirmingDelete && (
              <View style={styles.confirmation}>
                <Text style={styles.confirmationTitle}>Archive {motor.name}?</Text>
                <Text style={styles.notFoundText}>This hides the motor from the catalog. Existing booking records are kept.</Text>
                {deleteError && <Text accessibilityRole="alert" style={styles.deleteError}>{deleteError}</Text>}
                <MotorFormButton title="Confirm archive" onPress={handleDelete} busy={isDeleting} tone="danger" />
                <Pressable onPress={() => setConfirmingDelete(false)} disabled={isDeleting} accessibilityRole="button" style={styles.cancelButton}>
                  <Text style={styles.back}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : loading ? <View style={styles.notFound}><ActivityIndicator color="#21484a" accessibilityLabel="Loading motor details" /><Text style={styles.notFoundText}>Loading motor details…</Text></View> : error ? <View style={styles.confirmation}><Text style={styles.confirmationTitle}>Unable to load motor</Text><Text accessibilityRole="alert" style={styles.notFoundText}>{error}</Text><MotorFormButton title="Try again" onPress={retry} tone="outline" /></View> : (
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>Motor not available</Text>
            <Text style={styles.notFoundText}>This motor is no longer listed. Return to Explore to find another motor.</Text>
          </View>
        )}
      </ScrollView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 12, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center', gap: 16 }, back: { color: '#21484a', fontSize: 13, fontWeight: '600', minHeight: 44, paddingVertical: 12 }, content: { gap: 16 }, header: { color: '#1d2928', fontSize: 28, fontWeight: '700', letterSpacing: -0.7 }, card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de', overflow: 'hidden' }, image: { width: '100%', height: 220, backgroundColor: '#eff2ec', alignItems: 'center', justifyContent: 'center' }, cardContent: { padding: 20 }, title: { color: '#1d2928', fontSize: 25, fontWeight: '600', letterSpacing: -0.5, marginTop: 6 }, type: { color: '#65736e', fontSize: 12, fontWeight: '500' }, price: { color: '#21484a', fontSize: 22, fontWeight: '600', marginTop: 12 }, perDay: { color: '#65736e', fontSize: 13, fontWeight: '400' }, divider: { height: 1, backgroundColor: '#edf0e9', marginVertical: 18 }, description: { color: '#5c6b67', fontSize: 14, lineHeight: 23 },
  confirmation: { gap: 12, padding: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de' }, confirmationTitle: { color: '#273b37', fontSize: 17, fontWeight: '600' }, deleteError: { color: '#9b3d29', fontSize: 14, lineHeight: 22 }, cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, actions: { gap: 12, padding: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de' }, sectionTitle: { color: '#273b37', fontSize: 17, fontWeight: '600' }, editButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#21484a', borderRadius: 13, padding: 16 }, editButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' }, deleteButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 12 }, deleteButtonText: { color: '#9b3d29', fontSize: 13, fontWeight: '500' }, notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }, notFoundTitle: { color: '#1d2928', fontSize: 22, fontWeight: '600' }, notFoundText: { color: '#5c6b67', fontSize: 14, lineHeight: 22 },
});
