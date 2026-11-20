import { router } from 'expo-router';
import { requireOptionalNativeModule } from 'expo';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useMotorInventory } from '@/context/MotorContext';
import { readLocalImport, type LocalMotor } from '@/database/local-import';
import { getSupabaseClient } from '@/lib/supabase';
import { createLocalImportService, importErrorMessage, localMotorPayload } from '@/services/local-import';

export default function LocalMotorImportScreen() {
  const service = useMemo(() => createLocalImportService(getSupabaseClient()), []);
  const { refresh } = useMotorInventory();
  const [motors, setMotors] = useState<LocalMotor[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [imported, setImported] = useState<Map<number, string>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const running = useRef(false);
  const stop = useRef(false);

  const load = useCallback(async () => {
    let database: SQLiteDatabase | undefined;
    try {
      // Router evaluates route modules even before this screen is opened. Keep
      // legacy SQLite out of that path so cloud features work without the module.
      if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoSQLite')) {
        if (mounted.current) setError('Local import is unavailable in this app build because SQLite is not included. Use the original phone with SQLite support to import old motors, or rebuild your development app with expo-sqlite. Your shared Supabase motors and bookings remain available.');
        return;
      }
      const { openDatabaseAsync } = await import('expo-sqlite');
      database = await openDatabaseAsync('motor-rental.db', { useNewConnection: true });
      const local = await readLocalImport(database);
      const existing = local.sourceId && local.motors.length ? await service.mappings(local.sourceId) : new Map<number, string>();
      if (mounted.current) {
        setSourceId(local.sourceId); setMotors(local.motors); setImported(existing);
        setSelected(new Set()); setRowErrors(new Map()); setError(null);
      }
    } catch (cause) {
      if (mounted.current) setError(importErrorMessage(cause));
    } finally {
      if (database) { try { await database.closeAsync(); } catch { /* Preview data is already copied into memory. */ } }
      if (mounted.current) setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(() => { void load(); }, 0);
    return () => { mounted.current = false; stop.current = true; clearTimeout(timer); };
  }, [load]);

  const invalid = (motor: LocalMotor) => {
    try { localMotorPayload(motor); return null; } catch (cause) { return importErrorMessage(cause); }
  };
  const toggle = (id: number) => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const importSelected = async () => {
    if (running.current || !sourceId || !selected.size) return;
    running.current = true; stop.current = false; setBusy(true); setRowErrors(new Map());
    const pending = motors.filter(motor => selected.has(motor.id) && !imported.has(motor.id));
    let succeeded = 0;
    let failed = 0;
    try {
      for (const [index, motor] of pending.entries()) {
        if (stop.current || !mounted.current) break;
        setProgress(`Importing ${index + 1} of ${pending.length}: ${motor.name}`);
        try {
          const id = await service.importMotor(sourceId, motor);
          succeeded++;
          if (mounted.current) {
            setImported(current => new Map(current).set(motor.id, id));
            setSelected(current => { const next = new Set(current); next.delete(motor.id); return next; });
          }
        } catch (cause) {
          failed++;
          if (mounted.current) setRowErrors(current => new Map(current).set(motor.id, importErrorMessage(cause)));
        }
      }
    } finally {
      running.current = false;
      if (mounted.current) {
        setBusy(false);
        setProgress(`${stop.current ? 'Stopped. ' : ''}${succeeded} imported, ${failed} unconfirmed. Local motor records are unchanged.`);
        refresh();
      }
    }
  };

  return (
    <MainSafe>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.replace('/explore')} style={styles.back}>
          <Text style={styles.link}>← Explore</Text>
        </Pressable>
        <Text style={styles.title}>Import local motors</Text>
        <Text style={styles.description}>Use the phone that holds your original catalog. Select active motors to copy to the shared catalog. Images keep their HTTPS URLs; local motors stay intact.</Text>
        {loading ? <ActivityIndicator color="#21484a" accessibilityLabel="Reading local motors" /> : error ? (
          <View style={styles.panel}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <SubmitButton title="RELOAD PREVIEW" onPress={() => { setLoading(true); void load(); }} />
          </View>
        ) : (
          <>
            {!motors.length && <Text style={styles.description}>No active SQLite motors were found on this device. Open this screen on the original phone if you are using a different device or browser.</Text>}
            {motors.map(motor => {
              const validationError = invalid(motor);
              const done = imported.has(motor.id);
              return (
                <Pressable key={motor.id} style={styles.panel} accessibilityRole="checkbox"
                  accessibilityLabel={`Import ${motor.name}`} accessibilityState={{ checked: done || selected.has(motor.id), disabled: busy || done || !!validationError }}
                  disabled={busy || done || !!validationError} onPress={() => toggle(motor.id)}>
                  <Text style={styles.name}>{done ? '✓ Imported' : selected.has(motor.id) ? '☑ Selected' : '☐ Select'} · {motor.name}</Text>
                  <Text style={styles.description}>{motor.type} · ₱{motor.price.toLocaleString('en-PH')} / day</Text>
                  <Text style={styles.description}>{motor.description}</Text>
                  <Text style={styles.description} numberOfLines={2}>{motor.imageUrl}</Text>
                  {(validationError || rowErrors.get(motor.id)) && <Text accessibilityRole="alert" style={styles.error}>{validationError ?? rowErrors.get(motor.id)}</Text>}
                </Pressable>
              );
            })}
            {progress && <Text accessibilityRole="alert" style={styles.description}>{progress}</Text>}
            {selected.size > 0 && <SubmitButton title={`IMPORT ${selected.size} SELECTED`} onPress={importSelected} isSubmitting={busy} />}
            {busy && <Pressable accessibilityRole="button" style={styles.back} onPress={() => { stop.current = true; setProgress('Stopping after the current motor…'); }}><Text style={styles.link}>Stop after current motor</Text></Pressable>}
          </>
        )}
      </ScrollView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, gap: 16 },
  back: { paddingVertical: 12 },
  link: { color: '#21484a', fontSize: 16, fontWeight: '700' },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800' },
  description: { color: '#64748b', fontSize: 14, lineHeight: 22 },
  panel: { padding: 18, gap: 8, borderWidth: 1, borderColor: '#d9d2c4', borderRadius: 12, backgroundColor: '#faf8f2' },
  name: { color: '#21484a', fontSize: 16, fontWeight: '700' },
  error: { color: '#991b1b', fontSize: 14, lineHeight: 21 },
});
