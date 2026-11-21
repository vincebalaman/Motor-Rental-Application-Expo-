import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  addCalendarDays,
  calendarMonthDays,
  formatCalendarMonth,
  hasApprovedDateConflict,
  type ApprovedDateRange,
} from '@/services/bookings';

type Props = {
  today: string;
  maxPickup: string;
  maxReturn: string;
  pickup: string;
  returned: string;
  approvedDates: ApprovedDateRange[];
  onSelectDate: (date: string) => void;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function firstOfMonth(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function shiftMonth(value: string, amount: number) {
  const [year, month] = value.slice(0, 7).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 10);
}

export default function BookingCalendar({
  today,
  maxPickup,
  maxReturn,
  pickup,
  returned,
  approvedDates,
  onSelectDate,
}: Props) {
  const [month, setMonth] = useState(() => firstOfMonth(today));
  const selectingReturn = !!pickup && !returned;
  const lastSelectableDate = selectingReturn
    ? [addCalendarDays(pickup, 90), maxReturn].sort()[0]
    : maxPickup;
  const firstMonth = firstOfMonth(today);
  const lastMonth = firstOfMonth(lastSelectableDate);
  const dates = calendarMonthDays(month);

  return (
    <View style={styles.calendar}>
      <View style={styles.monthHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          accessibilityState={{ disabled: month <= firstMonth }}
          disabled={month <= firstMonth}
          onPress={() => setMonth(value => shiftMonth(value, -1))}
          style={styles.monthButton}
        >
          <Text style={[styles.monthArrow, month <= firstMonth && styles.disabledArrow]}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{formatCalendarMonth(month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: month >= lastMonth }}
          disabled={month >= lastMonth}
          onPress={() => setMonth(value => shiftMonth(value, 1))}
          style={styles.monthButton}
        >
          <Text style={[styles.monthArrow, month >= lastMonth && styles.disabledArrow]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map(day => (
          <View key={day} style={styles.dayCell}>
            <Text style={styles.weekday}>{day}</Text>
          </View>
        ))}
        {dates.map((date, index) => {
          if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
          const isPickup = date === pickup;
          const isReturn = date === returned;
          const isInRange = !!pickup && !!returned && date >= pickup && date <= returned;
          const isBooked = hasApprovedDateConflict(date, addCalendarDays(date, 1), approvedDates);
          const conflictsWithRange = selectingReturn && date > pickup
            && hasApprovedDateConflict(pickup, date, approvedDates);
          const outOfBounds = date < today
            || date > (selectingReturn ? [addCalendarDays(pickup, 90), maxReturn].sort()[0] : maxPickup)
            || (selectingReturn && date <= pickup);
          const disabled = outOfBounds || (selectingReturn ? conflictsWithRange : isBooked);
          const label = [
            formatCalendarMonth(firstOfMonth(date)),
            Number(date.slice(-2)),
            isBooked ? 'unavailable, approved booking' : '',
            isPickup ? 'pickup date' : '',
            isReturn ? 'return date' : '',
          ].filter(Boolean).join(', ');

          return (
            <View key={date} style={styles.dayCell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled, selected: isPickup || isReturn }}
                disabled={disabled}
                onPress={() => onSelectDate(date)}
                style={[
                  styles.dayButton,
                  isInRange && styles.rangeDay,
                  (isPickup || isReturn) && styles.selectedDay,
                  isBooked && styles.bookedDay,
                  disabled && !isBooked && styles.disabledDay,
                ]}
              >
                <Text style={[
                  styles.dayText,
                  isInRange && styles.rangeText,
                  (isPickup || isReturn) && styles.selectedText,
                  isBooked && styles.bookedText,
                  disabled && !isBooked && styles.disabledText,
                ]}>
                  {Number(date.slice(-2))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.availableDot]} /><Text style={styles.legendText}>Available</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.bookedDot]} /><Text style={styles.legendText}>Approved booking</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, styles.selectedDot]} /><Text style={styles.legendText}>Selected dates</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { padding: 16, gap: 14, backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#e1e2d9', borderRadius: 18 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  monthButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#e6eadd' },
  monthArrow: { color: '#21484a', fontSize: 28, lineHeight: 32, fontWeight: '700' },
  disabledArrow: { color: '#aab4ad' },
  monthTitle: { flex: 1, textAlign: 'center', color: '#183334', fontSize: 17, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', maxWidth: '14.2857%', minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: '#687a75', fontSize: 12, fontWeight: '700' },
  dayButton: { width: 40, height: 40, maxWidth: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  dayText: { color: '#183334', fontSize: 14, fontWeight: '600' },
  rangeDay: { backgroundColor: '#e6eadd', borderRadius: 12 },
  rangeText: { color: '#21484a' },
  selectedDay: { backgroundColor: '#21484a', borderRadius: 20 },
  selectedText: { color: '#faf8f2', fontWeight: '800' },
  bookedDay: { backgroundColor: '#f2e4dd', borderRadius: 12 },
  bookedText: { color: '#a46959', textDecorationLine: 'line-through' },
  disabledDay: { opacity: 0.45 },
  disabledText: { color: '#7c8882' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8, paddingTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  availableDot: { backgroundColor: '#a7b59d' },
  bookedDot: { backgroundColor: '#c98c76' },
  selectedDot: { backgroundColor: '#21484a' },
  legendText: { color: '#687a75', fontSize: 11 },
});
