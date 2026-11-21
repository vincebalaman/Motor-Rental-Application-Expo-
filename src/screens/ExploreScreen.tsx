import { type ComponentRef, useCallback, useRef, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import CatalogCard from '@/components/catalog-card';
import MainSafe from '@/components/mainsafe';
import { useAuth } from '@/context/AuthContext';
import { useMotorInventory } from '@/context/MotorContext';

export default function ExploreScreen() {
  const { motors, loading, error, retry, refreshing, refreshError, refresh } = useMotorInventory();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const searchRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [type, setType] = useState<string | null>(null);
  const types = [...new Set(motors.map(motor => motor.type.trim()))].sort();
  const selectedType = type && types.includes(type) ? type : null;
  const search = query.trim().toLowerCase();
  const filtered = motors.filter(motor => (!selectedType || motor.type.trim() === selectedType) && `${motor.name} ${motor.type}`.toLowerCase().includes(search));
  return <MainSafe>
    <FlatList
      data={filtered} keyExtractor={item => item.id} refreshing={refreshing} onRefresh={refresh}
      contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      ListHeaderComponent={<View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Explore motors</Text><Text style={styles.copy}>Find a motor for your next ride.</Text>
        <View style={styles.searchBox}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={20} tintColor="#65736e" accessible={false} />
          <TextInput ref={searchRef} value={query} onChangeText={setQuery} placeholder="Search name or type" accessibilityLabel="Search motors by name or type" placeholderTextColor="#65736e" style={styles.search} autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss} clearButtonMode="never" underlineColorAndroid="transparent" />
          {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear motor search" onPress={() => { setQuery(''); searchRef.current?.focus(); }} style={styles.clearSearch}><Text accessible={false} style={styles.clearSymbol}>×</Text></Pressable>}
        </View>
        <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {[null, ...types].map(value => <Pressable key={value ?? '__all'} accessibilityRole="button" accessibilityState={{ selected: selectedType === value }} onPress={() => setType(value)} style={[styles.chip, selectedType === value && styles.selected]}><Text style={[styles.chipText, selectedType === value && styles.selectedText]}>{value ?? 'All motors'}</Text></Pressable>)}
        </ScrollView>
        <View style={styles.resultRow}>
          <Text accessibilityLiveRegion="polite" style={styles.count}>{loading ? 'Loading motors…' : `${filtered.length} ${filtered.length === 1 ? 'motor' : 'motors'}${search || selectedType ? ' found' : ' to explore'}`}</Text>
          {user?.role === 'client' && <Pressable accessibilityRole="button" onPress={() => router.navigate('/bookings')} style={styles.bookingLink}><Text style={styles.bookingLinkText}>My bookings ↗</Text></Pressable>}
        </View>
        {refreshError && <Text accessibilityRole="alert" style={styles.copy}>{refreshError}</Text>}
        {user?.role === 'admin' && <View style={styles.admin}><Pressable accessibilityRole="button" onPress={() => router.push('/explore/import')} style={styles.adminButton}><Text style={styles.chipText}>Import local motors</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/explore/[id]/create', params: { id: 'new' } })} style={styles.adminButton}><Text style={styles.chipText}>+ Add motor</Text></Pressable></View>}
      </View>}
      renderItem={({ item }) => <CatalogCard motor={item} />}
      ListEmptyComponent={loading ? <View style={styles.empty}><ActivityIndicator color="#21484a" accessibilityLabel="Loading motors" /><Text style={styles.copy}>Loading the collection…</Text></View> : error ? <View style={styles.empty}><Text style={styles.emptyTitle}>Unable to load motors</Text><Text accessibilityRole="alert" style={styles.copy}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={styles.adminButton}><Text style={styles.chipText}>Try again</Text></Pressable></View> : <View style={styles.empty}><Text style={styles.emptyTitle}>{motors.length ? 'No matching rides' : 'More rides on the way'}</Text><Text style={styles.copy}>{motors.length ? 'Try another name or choose a different type.' : 'There are no motors listed yet. Pull down to check again.'}</Text>{!!(search || selectedType) && <Pressable accessibilityRole="button" style={styles.adminButton} onPress={() => { setQuery(''); setType(null); }}><Text style={styles.chipText}>Clear search and filters</Text></Pressable>}</View>}
    />
  </MainSafe>;
}
const styles = StyleSheet.create({
  list: { padding: 24, paddingTop: 20, gap: 20, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center', flexGrow: 1 }, header: { gap: 14 },
  title: { fontSize: 28, fontWeight: '700', color: '#1d2928', letterSpacing: -0.7 }, copy: { fontSize: 14, lineHeight: 22, color: '#5c6b67' },
  searchBox: { minHeight: 54, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4dd', borderRadius: 13, paddingLeft: 14, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }, search: { flex: 1, minWidth: 0, minHeight: 52, paddingVertical: 14, fontSize: 14, color: '#273b37' }, clearSearch: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, clearSymbol: { fontSize: 23, color: '#65736e' },
  filters: { gap: 8 }, chip: { minHeight: 44, justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 11 }, selected: { backgroundColor: '#21484a', borderColor: '#21484a' }, chipText: { color: '#21484a', fontSize: 13, fontWeight: '600' }, selectedText: { color: '#fff' },
  resultRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }, count: { color: '#65736e', fontSize: 12, lineHeight: 19 }, bookingLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 }, bookingLinkText: { color: '#21484a', fontSize: 13, fontWeight: '600' },
  admin: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, adminButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4dd', padding: 13, borderRadius: 11, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, empty: { padding: 24, gap: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de', borderRadius: 18 }, emptyTitle: { color: '#1d2928', fontSize: 20, fontWeight: '600', letterSpacing: -0.4 },
});
