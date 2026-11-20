import { Redirect, router } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import ProfileEditor from '@/components/profile-editor';
import { useAuth } from '@/context/AuthContext';

function SettingsRow({ symbol, title, description, onPress, disabled }: {
  symbol: string; title: string; description: string; onPress: () => void; disabled: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed, disabled && styles.disabled]}>
    <View style={styles.iconTile}><Text style={styles.iconText} accessibilityElementsHidden>{symbol}</Text></View>
    <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDescription}>{description}</Text></View>
    <Text style={styles.chevron} accessibilityElementsHidden>›</Text>
  </Pressable>;
}

export default function AccountScreen() {
  const { user, loading, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const leaving = useRef(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const editorScrolled = useRef(false);
  const disabled = profileBusy || loggingOut;
  const editProfile = () => {
    if (disabled) return;
    editorScrolled.current = false; setEditing(true); setSaved(false); setLogoutError(null);
  };
  const handleLogout = async () => {
    if (leaving.current || profileBusy) return;
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
        <View style={styles.header}><Text style={styles.brand}>MOTORRENT</Text><Text style={styles.title}>Your account</Text><Text style={styles.subtitle}>A little about you. All in one place.</Text></View>

        <View style={styles.profileCard}>
          <View style={styles.profileTop}><Text style={styles.profileEyebrow}>YOUR PROFILE</Text><View style={styles.roleBadge}><Text style={styles.roleText}>{user.role === 'admin' ? 'Administrator' : 'Client'}</Text></View></View>
          <View style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{initials || '?'}</Text></View><Text style={styles.name}>{user.fullName}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit your name and phone number" accessibilityState={{ disabled: disabled || editing }} disabled={disabled || editing} onPress={editProfile} style={({ pressed }) => [styles.editButton, pressed && styles.pressed, (disabled || editing) && styles.disabled]}><Text style={styles.editText}>{editing ? 'Editing your profile' : 'Edit profile'} <Text accessibilityElementsHidden>↗</Text></Text></Pressable>
        </View>

        {saved && <View accessibilityRole="alert" style={styles.successBanner}><Text style={styles.successMark} accessibilityElementsHidden>✓</Text><View style={styles.rowCopy}><Text style={styles.successTitle}>Profile updated</Text><Text style={styles.successCopy}>Your details are saved and ready for your next ride.</Text></View></View>}
        {editing && <View onLayout={event => {
          if (!editorScrolled.current) { editorScrolled.current = true; scroll.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 16), animated: true }); }
        }}><ProfileEditor key={user.id} fullName={user.fullName} phone={user.phone} onBusy={setProfileBusy} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); setSaved(true); }} /></View>}

        {!editing && <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Contact details</Text><Text style={styles.sectionHint}>For your bookings</Text></View>
          <View style={styles.card}>
            <View style={styles.contactRow}><View style={styles.iconTile}><Text style={styles.iconText} accessibilityElementsHidden>@</Text></View><View style={styles.rowCopy}><Text style={styles.contactLabel}>Email address</Text><Text selectable style={styles.contactValue}>{user.email}</Text></View></View>
            <View style={styles.divider} />
            <View style={styles.contactRow}><View style={styles.iconTile}><Text style={styles.iconText} accessibilityElementsHidden>☎</Text></View><View style={styles.rowCopy}><Text style={styles.contactLabel}>Phone number</Text><Text selectable style={[styles.contactValue, !user.phone && styles.muted]}>{user.phone || 'Not added yet'}</Text></View>{!user.phone && <Pressable accessibilityRole="button" accessibilityLabel="Add your phone number" disabled={disabled} onPress={editProfile} style={[styles.addButton, disabled && styles.disabled]}><Text style={styles.addText}>Add</Text></Pressable>}</View>
          </View>
          {!user.phone && <Text style={styles.helper}>Add a number so the rental shop can reach you about your ride.</Text>}
        </View>}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{user.role === 'admin' ? 'Your workspace' : 'Your rides'}</Text>
          <View style={styles.card}><SettingsRow symbol="▤" title={user.role === 'admin' ? 'Manage bookings' : 'My Bookings'} description={user.role === 'admin' ? 'Review requests and rental schedules' : 'Upcoming rides, requests, and history'} disabled={disabled} onPress={() => router.navigate(user.role === 'admin' ? '/admin-bookings' : '/bookings')} /></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & security</Text>
          <View style={styles.card}><SettingsRow symbol="↻" title="Reset password" description="Request a password recovery email" disabled={disabled} onPress={() => router.push('/auth/forgot-password')} /></View>
        </View>

        <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: loggingOut }} disabled={disabled} onPress={() => { void handleLogout(); }} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed, disabled && styles.disabled]}>
          {loggingOut ? <ActivityIndicator color="#9a5144" /> : <><Text style={styles.logoutSymbol} accessibilityElementsHidden>↪</Text><Text style={styles.logoutText}>Log out</Text></>}
        </Pressable>
        {logoutError && <Text accessibilityRole="alert" style={styles.error}>{logoutError}</Text>}
        <View style={styles.footer}><View style={styles.footerLine} /><Text style={styles.footerText}>MOTORRENT · READY FOR THE ROAD</Text><View style={styles.footerLine} /></View>
      </ScrollView>
    </KeyboardAvoidingView>
  </MainSafe>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center' }, page: { padding: 22, gap: 24, paddingBottom: 32, maxWidth: 780, width: '100%', alignSelf: 'center' },
  header: { gap: 7 }, brand: { color: '#70816e', fontSize: 10, fontWeight: '800', letterSpacing: 2.3 }, title: { color: '#183334', fontSize: 31, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: '#7a8376', fontSize: 14, lineHeight: 22 },
  profileCard: { backgroundColor: '#21484a', borderRadius: 26, padding: 24, gap: 24 }, profileTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, profileEyebrow: { color: '#bfcfbd', fontSize: 10, fontWeight: '700', letterSpacing: 1.6 }, roleBadge: { borderWidth: 1, borderColor: '#66867a', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#315a55' }, roleText: { color: '#dfebd4', fontSize: 11, fontWeight: '700' }, identity: { gap: 16, alignItems: 'center' }, avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e8edda', borderWidth: 5, borderColor: '#4d7062', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#21484a', fontSize: 26, fontWeight: '800' }, name: { color: '#faf8ef', fontSize: 25, fontWeight: '700', textAlign: 'center', lineHeight: 33 }, editButton: { minHeight: 46, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14, backgroundColor: '#e6ecd9', alignItems: 'center' }, editText: { color: '#21484a', fontSize: 13, fontWeight: '800' },
  section: { gap: 12 }, sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, sectionTitle: { color: '#28463f', fontSize: 16, fontWeight: '800' }, sectionHint: { color: '#8b9487', fontSize: 11 }, card: { backgroundColor: '#faf8f2', borderRadius: 20, borderWidth: 1, borderColor: '#e1e2d7', overflow: 'hidden' }, contactRow: { padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 82 }, iconTile: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#eaf0e2', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, iconText: { color: '#526e55', fontSize: 20, fontWeight: '600' }, rowCopy: { flex: 1, minWidth: 0, gap: 4 }, contactLabel: { color: '#7b8678', fontSize: 11 }, contactValue: { color: '#28463f', fontSize: 14, lineHeight: 22, fontWeight: '600', flexShrink: 1 }, muted: { color: '#959b8d', fontWeight: '400' }, divider: { height: 1, backgroundColor: '#e9e9df', marginLeft: 70, marginRight: 17 }, helper: { color: '#85907e', fontSize: 12, lineHeight: 19, paddingHorizontal: 3 }, addButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 9 }, addText: { color: '#52734f', fontSize: 13, fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, minHeight: 84 }, rowTitle: { color: '#28463f', fontSize: 14, fontWeight: '700' }, rowDescription: { color: '#7f897a', fontSize: 12, lineHeight: 18 }, chevron: { color: '#899981', fontSize: 27, paddingLeft: 5 },
  successBanner: { backgroundColor: '#e4ecda', borderWidth: 1, borderColor: '#d3e0c8', padding: 17, borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }, successMark: { color: '#52734f', fontSize: 22 }, successTitle: { color: '#365f3c', fontSize: 14, fontWeight: '800' }, successCopy: { color: '#6f8464', fontSize: 12, lineHeight: 18 },
  logoutButton: { minHeight: 54, borderWidth: 1, borderColor: '#dfd6ca', borderRadius: 16, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 15 }, logoutText: { color: '#9a5144', fontSize: 14, fontWeight: '700' }, logoutSymbol: { color: '#a36c59', fontSize: 20 }, error: { color: '#991b1b', fontSize: 13, lineHeight: 21 }, pressed: { opacity: 0.72 }, disabled: { opacity: 0.45 }, footer: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 5 }, footerLine: { flex: 1, height: 1, backgroundColor: '#dfe2d5', maxWidth: 45 }, footerText: { color: '#99a08e', fontSize: 8, fontWeight: '700', letterSpacing: 1.3, flexShrink: 1, textAlign: 'center' },
});
