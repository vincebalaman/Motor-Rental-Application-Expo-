import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

type MotorFieldProps = {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string;
  keyboardType?: KeyboardTypeOptions; multiline?: boolean; editable?: boolean; hint?: string; maxLength?: number;
};
export function MotorField({ label, value, onChangeText, placeholder, keyboardType, multiline = false, editable = true, hint, maxLength }: MotorFieldProps) {
  return <View style={motorFormStyles.field}>
    <Text style={motorFormStyles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} accessibilityHint={hint} style={[motorFormStyles.input, multiline && motorFormStyles.multilineInput]} value={value} editable={editable} autoCapitalize={keyboardType === 'url' ? 'none' : 'sentences'} autoCorrect={keyboardType !== 'url'} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#65736e" keyboardType={keyboardType} multiline={multiline} maxLength={maxLength} underlineColorAndroid="transparent" textAlignVertical={multiline ? 'top' : 'center'} />
    {hint && <Text style={motorFormStyles.hint}>{hint}</Text>}
  </View>;
}
export function MotorFormButton({ title, onPress, busy = false, tone = 'primary' }: {
  title: string; onPress: () => void; busy?: boolean; tone?: 'primary' | 'outline' | 'danger';
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onPress} style={({ pressed }) => [motorFormStyles.button, tone === 'outline' && motorFormStyles.outline, tone === 'danger' && motorFormStyles.danger, pressed && motorFormStyles.pressed, busy && motorFormStyles.disabled]}>
    {busy ? <ActivityIndicator color={tone === 'outline' ? '#21484a' : '#fff'} /> : <Text style={[motorFormStyles.buttonText, tone === 'outline' && motorFormStyles.outlineText]}>{title}</Text>}
  </Pressable>;
}
export const motorFormStyles = StyleSheet.create({
  keyboardAvoidingView: { flex: 1 }, content: { flexGrow: 1, padding: 24, paddingTop: 12, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center', gap: 16 }, back: { color: '#21484a', fontSize: 13, fontWeight: '600', paddingVertical: 12, minHeight: 44 }, form: { gap: 16 }, header: { color: '#1d2928', fontSize: 28, fontWeight: '700', letterSpacing: -0.7 }, subtitle: { color: '#5c6b67', fontSize: 14, lineHeight: 22 }, panel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de', borderRadius: 18, padding: 20, gap: 16 }, sectionTitle: { color: '#273b37', fontSize: 17, fontWeight: '600' }, field: { gap: 8 }, label: { color: '#65736e', fontSize: 12, lineHeight: 18 }, hint: { color: '#65736e', fontSize: 12, lineHeight: 19 }, input: { backgroundColor: '#fff', borderColor: '#dce4dd', borderRadius: 12, borderWidth: 1, color: '#273b37', fontSize: 14, minHeight: 54, paddingHorizontal: 14, paddingVertical: 14 }, multilineInput: { minHeight: 120 }, saveError: { color: '#9b3d29', fontSize: 14, lineHeight: 22 }, button: { minHeight: 52, padding: 16, borderRadius: 13, backgroundColor: '#21484a', alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' }, outline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4dd' }, outlineText: { color: '#21484a' }, danger: { backgroundColor: '#8c3730' }, pressed: { opacity: 0.7 }, disabled: { opacity: 0.4 },
});
