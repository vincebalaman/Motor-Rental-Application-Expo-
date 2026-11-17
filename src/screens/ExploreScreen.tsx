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
        <Text style={styles.eyebrow}>FIND YOUR NEXT RIDE</Text><Text style={styles.title}>Explore motors</Text><Text style={styles.copy}>Find your fit. Compare rides and daily rates.</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search by motor name or type" accessibilityLabel="Search motors" placeholderTextColor="#788780" style={styles.search} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {[null, ...types].map(value => <Pressable key={value ?? '__all'} accessibilityRole="button" accessibilityState={{ selected: selectedType === value }} onPress={() => setType(value)} style={[styles.chip, selectedType === value && styles.selected]}><Text style={[styles.chipText, selectedType === value && styles.selectedText]}>{value ?? 'All motors'}</Text></Pressable>)}
        </ScrollView>
        <Text style={styles.count}>{filtered.length} {filtered.length === 1 ? 'motor' : 'motors'}{search || selectedType ? ' found' : ' to explore'}</Text>
        {refreshError && <Text accessibilityRole="alert" style={styles.copy}>{refreshError}</Text>}
        {user?.role === 'admin' && <View style={styles.admin}><Pressable accessibilityRole="button" onPress={() => router.push('/explore/import')} style={styles.adminButton}><Text style={styles.chipText}>Import local motors</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/explore/[id]/create', params: { id: 'new' } })} style={styles.adminButton}><Text style={styles.chipText}>+ Add motor</Text></Pressable></View>}
      </View>}
      renderItem={({ item }) => <CatalogCard motor={item} />}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{motors.length ? 'No matching rides' : 'More rides on the way'}</Text><Text style={styles.copy}>{motors.length ? 'Try another name or choose a different type.' : 'There are no motors listed yet. Pull down to check again.'}</Text>{!!(search || selectedType) && <Pressable accessibilityRole="button" style={styles.adminButton} onPress={() => { setQuery(''); setType(null); }}><Text style={styles.chipText}>Clear search and filters</Text></Pressable>}</View>}
    />
  </MainSafe>;
}
const styles = StyleSheet.create({
  list: { padding: 22, gap: 18, paddingBottom: 32, maxWidth: 780, width: '100%', alignSelf: 'center' }, header: { gap: 14 },
  eyebrow: { fontSize: 10, color: '#526e65', letterSpacing: 1.8, fontWeight: '800' }, title: { fontSize: 32, fontWeight: '800', color: '#183334' }, copy: { fontSize: 14, lineHeight: 22, color: '#687a75' },
  search: { backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#dce0d5', borderRadius: 14, padding: 16, fontSize: 15, color: '#183334', minHeight: 52 }, filters: { gap: 10 }, chip: { backgroundColor: '#e6eadd', paddingVertical: 13, paddingHorizontal: 18, borderRadius: 24 }, selected: { backgroundColor: '#21484a' }, chipText: { color: '#21484a', fontSize: 13, fontWeight: '700' }, selectedText: { color: '#faf8f2' }, count: { color: '#687a75', fontSize: 13 }, admin: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, adminButton: { backgroundColor: '#e2e9df', padding: 15, borderRadius: 12, minHeight: 44 }, empty: { padding: 24, gap: 14, backgroundColor: '#faf8f2', borderRadius: 20 }, emptyTitle: { color: '#183334', fontSize: 22, fontWeight: '800' },
});
