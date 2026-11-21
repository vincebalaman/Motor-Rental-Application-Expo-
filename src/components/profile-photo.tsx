import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Text, View } from 'react-native';
import { MotorPhotoInput } from '@/components/motor-photo-input';
import { MotorFormButton, motorFormStyles as styles } from '@/components/motor-form';
import { getSupabaseClient } from '@/lib/supabase';
import { photoBytes, type MotorPhoto } from '@/services/motor-photos';
import { createProfilePhotoService } from '@/services/profile-photos';

export default function ProfilePhoto({ userId, initials, disabled, onBusy }: {
  userId: string; initials: string; disabled: boolean; onBusy: (busy: boolean) => void;
}) {
  const service = useMemo(() => createProfilePhotoService(getSupabaseClient()), []);
  const [url, setUrl] = useState('');
  const [photo, setPhoto] = useState<MotorPhoto | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const revision = useRef(0);
  const saving = useRef(false);
  const active = useRef(true);
  const load = useCallback(async () => {
    const request = ++revision.current;
    try { const next = await service.load(userId); if (active.current && revision.current === request) { setUrl(next); setError(null); } }
    catch (cause) { if (active.current && revision.current === request) setError(cause instanceof Error ? cause.message : 'Could not load your photo.'); }
  }, [service, userId]);
  const invalidate = useCallback(() => { revision.current++; }, []);
  useEffect(() => {
    active.current = true;
    const initial = setTimeout(() => { void load(); }, 0);
    const listener = AppState.addEventListener('change', state => { if (state === 'active' && !saving.current) void load(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active' && !saving.current) void load(); }, 45 * 60 * 1000);
    return () => { active.current = false; invalidate(); clearTimeout(initial); listener.remove(); clearInterval(timer); };
  }, [load, invalidate]);
  const save = async () => {
    if (!photo || saving.current || picking || disabled) return;
    saving.current = true; revision.current++; setBusy(true); onBusy(true); setError(null); setSaved(false);
    try {
      const next = await service.save(userId, photo.id, photoBytes(photo.base64));
      if (active.current) { setUrl(next || photo.uri); setPhoto(null); setEditing(false); setSaved(true); }
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : 'Your photo could not be saved.'); }
    finally { saving.current = false; if (active.current) { setBusy(false); onBusy(false); } }
  };
  return <View style={{ gap: 12 }}>
    <View style={{ alignItems: 'center', gap: 12 }}>
      {url ? <Image source={{ uri: url }} accessibilityLabel="Your profile photo" onError={() => setUrl('')} style={{ width: 80, height: 80, borderRadius: 40 }} /> : <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#e5ebe7', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 24, color: '#21484a' }}>{initials}</Text></View>}
      {!editing && <MotorFormButton title={url ? 'Change profile photo' : 'Choose profile photo'} tone="outline" busy={disabled} onPress={() => { setEditing(true); setSaved(false); }} />}
    </View>
    {editing && <>
      <MotorPhotoInput profile photo={photo} currentUrl={url} onChange={setPhoto} disabled={busy || disabled} onBusyChange={value => { setPicking(value); onBusy(value); }} />
      {photo && <MotorFormButton title="Save profile photo" busy={busy || picking || disabled} onPress={() => void save()} />}
      <MotorFormButton title="Cancel" tone="outline" busy={busy || picking || disabled} onPress={() => { setPhoto(null); setEditing(false); }} />
    </>}
    {saved && <Text accessibilityRole="alert" style={styles.hint}>Profile photo saved.</Text>}
    {error && <><Text accessibilityRole="alert" style={styles.saveError}>{error}</Text>{!editing && <MotorFormButton title="Retry photo" tone="outline" busy={disabled} onPress={() => void load()} />}</>}
  </View>;
}
