import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, canSelectCalendarDate, type DateRange, formatBookingDate, monthCells, selectCalendarDate, shiftMonth } from '@/services/booking-calendar';

export default function BookingCalendar({ range, blocked, today, disabled = false, pickupOnly = false, onChange }: {
  range: DateRange; blocked: readonly string[]; today: string; disabled?: boolean; pickupOnly?: boolean; onChange: (range: DateRange) => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const choosingReturn = !pickupOnly && !!range.pickup && !range.returned;
  const earliestMonth = today.slice(0, 7);
  const lastMonth = (choosingReturn ? addDays(range.pickup, 90) : range.returned && range.returned > addDays(today, 365) ? range.returned : addDays(today, 365)).slice(0, 7);
  // Keep the selected return visible even when it extends beyond the pickup horizon.
  const visibleMonth = month < earliestMonth ? earliestMonth : month > lastMonth ? lastMonth : month;
  const title = new Date(`${visibleMonth}-01T00:00:00Z`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return <View style={styles.calendar}>
    <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>{title}</Text><View style={styles.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={disabled || visibleMonth <= earliestMonth} onPress={() => setMonth(shiftMonth(visibleMonth, -1))} style={[styles.nav, (disabled || visibleMonth <= earliestMonth) && styles.faded]}><Text style={styles.navText}>‹</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={disabled || visibleMonth >= lastMonth} onPress={() => setMonth(shiftMonth(visibleMonth, 1))} style={[styles.nav, (disabled || visibleMonth >= lastMonth) && styles.faded]}><Text style={styles.navText}>›</Text></Pressable>
    </View></View>
    <Text accessibilityLiveRegion="polite" style={styles.instruction}>{pickupOnly ? 'Choose your pickup date' : choosingReturn ? 'Now choose your return date' : range.returned ? 'Dates selected. Tap a new pickup to start over.' : 'Choose your pickup date'}</Text>
    <View style={styles.grid}>
      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => <View key={`weekday-${index}`} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}
      {monthCells(visibleMonth).map((date, index) => {
        if (!date) return <View key={`blank-${index}`} style={styles.cell} />;
        const unavailable = blocked.includes(date);
        const allowed = !disabled && canSelectCalendarDate(date, pickupOnly ? { pickup: '', returned: '' } : range, blocked, today);
        const endpoint = date === range.pickup || date === range.returned;
        const inside = !!range.pickup && !!range.returned && date > range.pickup && date < range.returned;
        return <View key={date} style={[styles.cell, inside && styles.range]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${formatBookingDate(date, true)}${date === today ? ', today' : ''}${date === range.pickup ? ', pickup' : date === range.returned ? ', return' : ''}${unavailable ? allowed ? ', return only' : ', unavailable' : ''}`} accessibilityState={{ disabled: !allowed, selected: endpoint || inside }} disabled={!allowed} onPress={() => onChange(pickupOnly ? { pickup: date, returned: '' } : selectCalendarDate(date, range, blocked, today))} style={[styles.day, date === today && styles.today, endpoint && styles.endpoint]}>
            <Text style={[styles.dayText, !allowed && styles.disabledText, unavailable && !allowed && styles.strike, endpoint && styles.endpointText]}>{Number(date.slice(-2))}</Text>
          </Pressable>
        </View>;
      })}
    </View>
    <View style={styles.legend}><View style={styles.legendItem}><View style={[styles.swatch, styles.endpoint]} /><Text style={styles.legendText}>Selected</Text></View>{!pickupOnly && <View style={styles.legendItem}><View style={[styles.swatch, styles.range]} /><Text style={styles.legendText}>Rental days</Text></View>}<View style={styles.legendItem}><Text style={styles.unavailableSymbol}>×</Text><Text style={styles.legendText}>Unavailable</Text></View></View>
    <Text style={styles.hint}>{pickupOnly ? 'Crossed-out dates are fully booked. Your selected time and full rental period are checked before booking.' : 'Your return day is not charged. You can return on the first unavailable day, but cannot rent through it.'}</Text>
  </View>;
}
const styles = StyleSheet.create({
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, swatch: { width: 10, height: 10, borderRadius: 3 }, unavailableSymbol: { color: '#65736e', fontSize: 16 },
  calendar: { padding: 16, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de', gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }, title: { color: '#1d2928', fontSize: 17, fontWeight: '600' }, navigation: { flexDirection: 'row', gap: 4 }, nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#f2f5ef' }, navText: { color: '#21484a', fontSize: 30 }, faded: { opacity: 0.35 },
  instruction: { color: '#65736e', fontSize: 12, fontWeight: '500' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center' }, weekday: { color: '#65736e', fontSize: 12, fontWeight: '700' }, day: { width: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11 }, dayText: { color: '#21484a', fontSize: 14, fontWeight: '500' }, today: { borderWidth: 1, borderColor: '#8ca58b' }, range: { backgroundColor: '#dfe9d9' }, endpoint: { backgroundColor: '#21484a' }, endpointText: { color: '#fff', fontWeight: '800' }, disabledText: { color: '#8b958d' }, strike: { textDecorationLine: 'line-through' }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, legendText: { color: '#526e65', fontSize: 11 }, hint: { color: '#65736e', fontSize: 12, lineHeight: 18 },
});
