import { Link, Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { dailyPrice } from '@/components/catalog-card';
import MainSafe from '@/components/mainsafe';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';

const bookingLabels = { pending: 'Pending approval', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
const bookingColors = { pending: '#825510', approved: '#21623c', rejected: '#991b1b', cancelled: '#687a75' };

export default function AccountScreen() {
  const { user, loading, logout } = useAuth();
  const { bookings, loading: bookingsLoading, error: bookingsError, refresh: refreshBookings } = useBookings();
  const [loggingOut, setLoggingOut] = useState(false);
  useFocusEffect(useCallback(() => {
    if (user?.role === 'client') refreshBookings();
  }, [refreshBookings, user?.role]));

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      Alert.alert('Logout failed', 'We could not sign you out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#21484a" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <MainSafe>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MOTORRENT</Text>
          <Text style={styles.title}>Your account</Text>
          <Text style={styles.subtitle}>Manage your profile and preferences.</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileLabel}>SIGNED IN AS</Text>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.email}>{user.role === 'admin' ? 'Administrator' : 'Client'}</Text>
          </View>
        </View>

        {user.role === 'client' && (
          <View style={styles.section}>
            <View style={styles.historyHeader}>
              <View style={styles.historyHeading}>
                <Text style={styles.sectionTitle}>Booking history</Text>
                <Text style={styles.historySubtitle}>Your recent rides and request status.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/bookings')}
                style={styles.historyLink}
              >
                <Text style={styles.historyLinkText}>View all</Text>
                <Text style={styles.historyChevron}>›</Text>
              </Pressable>
            </View>

            {bookingsError ? (
              <View style={styles.historyEmpty}>
                <Text accessibilityRole="alert" style={styles.historyError}>{bookingsError}</Text>
                <Pressable accessibilityRole="button" onPress={refreshBookings} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : bookingsLoading && !bookings.length ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator color="#21484a" accessibilityLabel="Loading booking history" />
              </View>
            ) : bookings.length ? (
              <View style={styles.historyList}>
                {bookings.slice(0, 3).map(booking => {
                  const rentalDays = (Date.parse(booking.return_date) - Date.parse(booking.pickup_date)) / 86400000;
                  return (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingCardHeader}>
                        <Text style={[styles.bookingStatus, { color: bookingColors[booking.status] }]}>
                          {bookingLabels[booking.status]}
                        </Text>
                        <Text style={styles.bookingTotal}>{dailyPrice(booking.total_centavos / 100)}</Text>
                      </View>
                      <Text style={styles.bookingMotor}>{booking.motor_name}</Text>
                      <Text style={styles.bookingDates}>
                        {booking.pickup_date} → {booking.return_date}
                      </Text>
                      <Text style={styles.bookingRate}>
                        {dailyPrice(booking.daily_rate_centavos / 100)} / day · {rentalDays} {rentalDays === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                  );
                })}
                {bookings.length > 3 && (
                  <Text style={styles.moreBookings}>Showing 3 of {bookings.length} bookings</Text>
                )}
              </View>
            ) : (
              <View style={styles.historyEmpty}>
                <Text style={styles.emptyTitle}>No bookings yet</Text>
                <Text style={styles.historySubtitle}>Your ride requests and their status will appear here.</Text>
                <Pressable accessibilityRole="button" onPress={() => router.navigate('/explore')} style={styles.exploreButton}>
                  <Text style={styles.exploreButtonText}>Explore motors →</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account settings</Text>
          <Link href="/auth/forgot-password" asChild>
            <Pressable style={styles.settingRow} accessibilityRole="button">
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>•</Text>
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Reset password</Text>
                <Text style={styles.settingDescription}>Get help recovering your password</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Link>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#991b1b" />
          ) : (
            <Text style={styles.logoutText}>Log out</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>Ride with confidence.</Text>
      </ScrollView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3efe6' },
  container: { flexGrow: 1, padding: 24, paddingTop: 36, paddingBottom: 32 },
  header: { marginBottom: 26 },
  eyebrow: { color: '#21484a', fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 22, marginTop: 6 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 16,
    padding: 22,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#21484a',
    borderColor: '#527a77',
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: { color: '#ffffff', fontSize: 21, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  name: { color: '#ffffff', fontSize: 19, lineHeight: 25, fontWeight: '700', marginTop: 5, flexShrink: 1 },
  email: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },
  section: { marginTop: 32, gap: 12 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  historyHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  historyHeading: { flex: 1, minWidth: 180 },
  historySubtitle: { color: '#687a75', fontSize: 13, lineHeight: 20 },
  historyLink: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 10, gap: 2 },
  historyLinkText: { color: '#21484a', fontSize: 14, fontWeight: '800' },
  historyChevron: { color: '#21484a', fontSize: 22, lineHeight: 26 },
  historyList: { gap: 10 },
  bookingCard: { padding: 16, gap: 7, backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#e1e2d9', borderRadius: 16 },
  bookingCardHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, rowGap: 4 },
  bookingStatus: { fontSize: 12, fontWeight: '800' },
  bookingTotal: { color: '#21484a', fontSize: 16, fontWeight: '800' },
  bookingMotor: { color: '#183334', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  bookingDates: { color: '#425752', fontSize: 13, lineHeight: 20 },
  bookingRate: { color: '#687a75', fontSize: 12, lineHeight: 18 },
  moreBookings: { color: '#687a75', fontSize: 12, textAlign: 'center', paddingTop: 3 },
  historyEmpty: { padding: 18, gap: 8, backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#e1e2d9', borderRadius: 16 },
  historyLoading: { minHeight: 88, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f2', borderRadius: 16 },
  historyError: { color: '#991b1b', fontSize: 14, lineHeight: 21 },
  emptyTitle: { color: '#183334', fontSize: 16, fontWeight: '800' },
  retryButton: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#e6eadd' },
  retryText: { color: '#21484a', fontSize: 13, fontWeight: '800' },
  exploreButton: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', marginTop: 2, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#e6eadd' },
  exploreButtonText: { color: '#21484a', fontSize: 13, fontWeight: '800' },
  settingRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  settingIcon: {
    alignItems: 'center',
    backgroundColor: '#e7efed',
    borderRadius: 11,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  settingIconText: { color: '#21484a', fontSize: 25, fontWeight: '800', lineHeight: 28 },
  settingCopy: { flex: 1 },
  settingTitle: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  settingDescription: { color: '#64748b', fontSize: 13, marginTop: 4 },
  chevron: { color: '#64748b', fontSize: 28, lineHeight: 30 },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#fff7f7',
    borderColor: '#fecaca',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 28,
    paddingVertical: 15,
  },
  logoutText: { color: '#991b1b', fontSize: 15, fontWeight: '700' },
  buttonPressed: { opacity: 0.75 },
  footer: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 24, textAlign: 'center' },
});
