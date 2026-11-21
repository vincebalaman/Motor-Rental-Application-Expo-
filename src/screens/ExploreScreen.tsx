import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import CatalogCard from '@/components/catalog-card';
import MainSafe from '@/components/mainsafe';
import { useAuth } from '@/context/AuthContext';
import { useMotorInventory } from '@/context/MotorContext';

export default function ExploreScreen() {
  const { motors, refreshing, refreshError, refresh } = useMotorInventory();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string | null>(null);
  const types = [...new Set(motors.map(motor => motor.type.trim()))].sort();
  const selectedType = type && types.includes(type) ? type : null;
  const search = query.trim().toLowerCase();
  const filtered = motors.filter(motor => (!selectedType || motor.type.trim() === selectedType) && `${motor.name} ${motor.type}`.toLowerCase().includes(search));
  return <MainSafe>
    <FlatList
      data={filtered} keyExtractor={item => item.id} refreshing={refreshing} onRefresh={refresh}
      contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>FIND YOUR NEXT RIDE</Text>
          <Text style={styles.title}>Explore motors</Text>
          <Text style={styles.heroCopy}>Find your fit. Compare rides and daily rates.</Text>
        </View>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon} accessibilityElementsHidden importantForAccessibility="no">⌕</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Search motors" accessibilityLabel="Search motors by name or type" placeholderTextColor="#71807a" style={styles.search} autoCorrect={false} returnKeyType="search" />
          {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear motor search" onPress={() => setQuery('')} style={styles.clearSearch}><Text style={styles.clearSearchText}>×</Text></Pressable>}
        </View>
        <View>
          <Text style={styles.filterLabel}>MOTOR TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {[null, ...types].map(value => <Pressable key={value ?? '__all'} accessibilityRole="button" accessibilityState={{ selected: selectedType === value }} onPress={() => setType(value)} style={[styles.chip, selectedType === value && styles.selected]}><Text style={[styles.chipText, selectedType === value && styles.selectedText]}>{value ?? 'All motors'}</Text></Pressable>)}
          </ScrollView>
        </View>
        <Text style={styles.count}>{filtered.length} {filtered.length === 1 ? 'motor' : 'motors'}{search || selectedType ? ' found' : ' to explore'}</Text>
        {user?.role === 'client' && <Pressable accessibilityRole="button" onPress={() => router.navigate('/bookings')} style={styles.bookingLink}><Text style={styles.bookingLinkText}>My bookings →</Text></Pressable>}
        {refreshError && <Text accessibilityRole="alert" style={styles.copy}>{refreshError}</Text>}
        {user?.role === 'admin' && <View style={styles.admin}><Pressable accessibilityRole="button" onPress={() => router.push('/explore/import')} style={styles.adminButton}><Text style={styles.chipText}>Import local motors</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/explore/[id]/create', params: { id: 'new' } })} style={styles.adminButton}><Text style={styles.chipText}>+ Add motor</Text></Pressable></View>}
      </View>}
      renderItem={({ item }) => <CatalogCard motor={item} />}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{motors.length ? 'No matching rides' : 'More rides on the way'}</Text><Text style={styles.copy}>{motors.length ? 'Try another name or choose a different type.' : 'There are no motors listed yet. Pull down to check again.'}</Text>{!!(search || selectedType) && <Pressable accessibilityRole="button" style={styles.adminButton} onPress={() => { setQuery(''); setType(null); }}><Text style={styles.chipText}>Clear search and filters</Text></Pressable>}</View>}
    />
  </MainSafe>;
}
const styles = StyleSheet.create({
  list: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 18, maxWidth: 780, width: '100%', alignSelf: 'center' },
  header: { gap: 18 },
  hero: { padding: 24, gap: 10, borderRadius: 22, backgroundColor: '#21484a' },
  eyebrow: { fontSize: 10, color: '#d0dfc7', letterSpacing: 1.8, fontWeight: '800' },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#faf8f2' },
  heroCopy: { fontSize: 14, lineHeight: 21, color: '#e0e9df' },
  copy: { fontSize: 14, lineHeight: 22, color: '#687a75' },
  searchBar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e1e2d9', backgroundColor: '#faf8f2' },
  searchIcon: { color: '#526e65', fontSize: 25, marginRight: 8 },
  search: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 15, color: '#183334' },
  clearSearch: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  clearSearchText: { color: '#526e65', fontSize: 24, lineHeight: 28 },
  filterLabel: { color: '#526e65', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 9 },
  filters: { gap: 9, paddingRight: 8 },
  chip: { backgroundColor: '#e6eadd', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 24, minHeight: 42, justifyContent: 'center' },
  selected: { backgroundColor: '#21484a' },
  chipText: { color: '#21484a', fontSize: 13, fontWeight: '700' },
  selectedText: { color: '#faf8f2' },
  count: { color: '#687a75', fontSize: 13, fontWeight: '600' },
  bookingLink: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#e2e9df' },
  bookingLinkText: { color: '#21484a', fontSize: 14, fontWeight: '800' },
  admin: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  adminButton: { backgroundColor: '#e2e9df', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  empty: { padding: 24, gap: 14, backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#e1e2d9', borderRadius: 20 },
  emptyTitle: { color: '#183334', fontSize: 22, lineHeight: 28, fontWeight: '800' },
});
