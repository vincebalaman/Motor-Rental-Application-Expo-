import { Redirect, router } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import ProfilePhoto from '@/components/profile-photo';
import ProfileEditor from '@/components/profile-editor';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

function SettingsRow({ title, description, onPress, disabled }: {
  title: string; description: string; onPress: () => void; disabled: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed, disabled && styles.disabled]}>
    <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDescription}>{description}</Text></View>
    <Text style={styles.chevron} accessibilityElementsHidden>›</Text>
  </Pressable>;
}

export default function AccountScreen() {
  const { unread, error: notificationError } = useNotifications();
  const { user, loading, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const leaving = useRef(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const editorScrolled = useRef(false);
  const disabled = profileBusy || photoBusy || loggingOut;
  const editProfile = () => {
    if (disabled) return;
    editorScrolled.current = false; setEditing(true); setSaved(false); setLogoutError(null);
  };
  const handleLogout = async () => {
    if (leaving.current || profileBusy || photoBusy) return;
    leaving.current = true; setLoggingOut(true); setLogoutError(null);
    try { await logout(); }
    catch { setLogoutError('We could not sign you out. Check your connection and try again.'); }
    finally { leaving.current = false; setLoggingOut(false); }
  };
  if (loading) return <MainSafe><View style={styles.loading}><ActivityIndicator color="#21484a" accessibilityLabel="Loading account" /></View></MainSafe>;
  if (!user) return <Redirect href="/auth/login" />;
  const initials = user.fullName.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');

  return <MainSafe>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Account</Text><Text style={styles.subtitle}>Manage your details and security.</Text></View>

        <View style={styles.profileCard}>
          <View style={styles.identity}><View style={styles.rowCopy}><Text style={styles.name}>{user.fullName}</Text><Text selectable style={styles.profileEmail}>{user.email}</Text></View></View>
          <ProfilePhoto key={user.id} userId={user.id} initials={initials || '?'} disabled={profileBusy || loggingOut} onBusy={setPhotoBusy} />
          <View style={styles.profileActions}><View style={styles.roleBadge}><Text style={styles.roleText}>{user.role === 'admin' ? 'Administrator' : 'Client'}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit your name and phone number" accessibilityState={{ disabled: disabled || editing }} disabled={disabled || editing} onPress={editProfile} style={({ pressed }) => [styles.editButton, pressed && styles.pressed, (disabled || editing) && styles.disabled]}><Text style={styles.editText}>{editing ? 'Editing your profile' : 'Edit profile'} <Text accessibilityElementsHidden>↗</Text></Text></Pressable></View>
        </View>

        {saved && <View accessibilityRole="alert" style={styles.successBanner}><Text style={styles.successMark} accessibilityElementsHidden>✓</Text><View style={styles.rowCopy}><Text style={styles.successTitle}>Profile updated</Text><Text style={styles.successCopy}>Your changes have been saved.</Text></View></View>}
        {editing && <View onLayout={event => {
          if (!editorScrolled.current) { editorScrolled.current = true; scroll.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 16), animated: true }); }
        }}><ProfileEditor key={user.id} fullName={user.fullName} phone={user.phone} onBusy={setProfileBusy} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); setSaved(true); }} /></View>}

        {!editing && <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Personal details</Text><Text style={styles.sectionHint}>For your bookings</Text></View>
          <View style={styles.card}>
            <View style={styles.contactRow}><View style={styles.rowCopy}><Text style={styles.contactLabel}>Full name</Text><Text selectable style={styles.contactValue}>{user.fullName}</Text></View></View>
            <View style={styles.divider} />
            <View style={styles.contactRow}><View style={styles.rowCopy}><Text style={styles.contactLabel}>Phone number</Text><Text selectable style={[styles.contactValue, !user.phone && styles.muted]}>{user.phone || 'Not added yet'}</Text></View>{!user.phone && <Pressable accessibilityRole="button" accessibilityLabel="Add your phone number" disabled={disabled} onPress={editProfile} style={[styles.addButton, disabled && styles.disabled]}><Text style={styles.addText}>Add</Text></Pressable>}</View>
          </View>
          {!user.phone && <Text style={styles.helper}>Add a number so the rental shop can reach you about your ride.</Text>}
        </View>}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{user.role === 'admin' ? 'Your workspace' : 'Your rides'}</Text>
          <View style={styles.card}><SettingsRow title={user.role === 'admin' ? 'Manage bookings' : 'My bookings'} description={user.role === 'admin' ? 'Review requests and rental schedules' : 'Upcoming rides, requests, and history'} disabled={disabled} onPress={() => router.navigate(user.role === 'admin' ? '/admin-bookings' : '/bookings')} /></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & security</Text>
          <View style={styles.card}><SettingsRow title="Notifications" description={notificationError ? 'Check your booking updates' : unread ? `${unread} unread ${unread === 1 ? 'update' : 'updates'}` : 'Booking updates and ride reminders'} disabled={disabled} onPress={() => router.push('/notifications')} /></View>
          <View style={styles.card}><SettingsRow title="Change password" description="Send a password reset email" disabled={disabled} onPress={() => router.push('/auth/forgot-password')} /></View>
        </View>

        <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: loggingOut }} disabled={disabled} onPress={() => { void handleLogout(); }} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed, disabled && styles.disabled]}>
          {loggingOut ? <ActivityIndicator color="#9b3d29" /> : <Text style={styles.logoutText}>Log out</Text>}
        </Pressable>
        {logoutError && <Text accessibilityRole="alert" style={styles.error}>{logoutError}</Text>}
        <Text style={styles.footerText}>MotorRent</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </MainSafe>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center' }, page: { padding: 24, paddingTop: 20, gap: 24, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { gap: 8 }, title: { color: '#1d2928', fontSize: 28, fontWeight: '700', letterSpacing: -0.7 }, subtitle: { color: '#5c6b67', fontSize: 14, lineHeight: 22 },
  profileCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de', padding: 20, gap: 16 }, identity: { flexDirection: 'row', gap: 14, alignItems: 'center' }, avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e5ebe7', borderWidth: 1, borderColor: '#d6dfd9', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, avatarText: { color: '#21484a', fontSize: 20, fontWeight: '600' }, name: { color: '#1d2928', fontSize: 20, fontWeight: '600', lineHeight: 28, letterSpacing: -0.4 }, profileEmail: { color: '#65736e', fontSize: 13, lineHeight: 20 },
  profileActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 14, borderTopWidth: 1, borderColor: '#edf0e9' }, roleBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#edf2e9' }, roleText: { color: '#285940', fontSize: 11, fontWeight: '600' }, editButton: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: '#dce4dd', justifyContent: 'center' }, editText: { color: '#21484a', fontSize: 13, fontWeight: '600' },
  section: { gap: 12 }, sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, sectionTitle: { color: '#1d2928', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 }, sectionHint: { color: '#65736e', fontSize: 12 }, card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de', overflow: 'hidden' }, contactRow: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76 }, rowCopy: { flex: 1, minWidth: 0, gap: 5 }, contactLabel: { color: '#65736e', fontSize: 12 }, contactValue: { color: '#273b37', fontSize: 14, lineHeight: 22, fontWeight: '500', flexShrink: 1 }, muted: { color: '#65736e', fontWeight: '400' }, divider: { height: 1, backgroundColor: '#edf0e9', marginHorizontal: 18 }, helper: { color: '#65736e', fontSize: 12, lineHeight: 19 }, addButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 }, addText: { color: '#21484a', fontSize: 13, fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, minHeight: 76 }, rowTitle: { color: '#273b37', fontSize: 14, fontWeight: '600' }, rowDescription: { color: '#65736e', fontSize: 12, lineHeight: 19 }, chevron: { color: '#65736e', fontSize: 24, paddingLeft: 5 },
  successBanner: { backgroundColor: '#edf2e9', borderWidth: 1, borderColor: '#dce5d7', padding: 16, borderRadius: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }, successMark: { color: '#285940', fontSize: 20 }, successTitle: { color: '#285940', fontSize: 14, fontWeight: '600' }, successCopy: { color: '#526663', fontSize: 12, lineHeight: 19 },
  logoutButton: { minHeight: 52, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5d8d2', borderRadius: 13, alignItems: 'center', justifyContent: 'center', padding: 15 }, logoutText: { color: '#9b3d29', fontSize: 14, fontWeight: '600' }, error: { color: '#9b3d29', fontSize: 13, lineHeight: 21 }, pressed: { opacity: 0.7 }, disabled: { opacity: 0.4 }, footerText: { color: '#65736e', fontSize: 12, textAlign: 'center', paddingVertical: 4 },
});
