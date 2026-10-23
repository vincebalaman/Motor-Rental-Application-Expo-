import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useMotorInventory } from '@/context/MotorContext';

export default function EditMotorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const motorId = Number(Array.isArray(id) ? id[0] : id);
  const { motors, updateMotor } = useMotorInventory();
  const motor = motors.find((item) => item.id === motorId);
  const [name, setName] = useState(motor?.name ?? '');
  const [type, setType] = useState(motor?.type ?? '');
  const [price, setPrice] = useState(motor ? String(motor.price) : '');
  const [description, setDescription] = useState(motor?.description ?? '');
  const [imageUrl, setImageUrl] = useState(motor?.imageUrl ?? '');

  const handleSave = () => {
    const parsedPrice = Number(price.trim());
    if (!motor || !Number.isInteger(motorId)) {
      Alert.alert('Motor not found', 'This motor is no longer available.');
      return;
    }
    if (!name.trim() || !type.trim() || !description.trim() || !price.trim() || !imageUrl.trim()) {
      Alert.alert('Missing fields', 'Please complete all motor details.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid price', 'Enter a price greater than zero.');
      return;
    }

    updateMotor(motorId, {
      name: name.trim(),
      type: type.trim(),
      price: parsedPrice,
      description: description.trim(),
      imageUrl: imageUrl.trim(),
    });
    router.replace({
      pathname: '/(tabs)/explore/[id]',
      params: { id: String(motorId) },
    });
  };

  if (!motor) {
    return (
      <MainSafe>
        <View style={styles.notFound}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Motor not found</Text>
        </View>
      </MainSafe>
    );
  }

  return (
    <MainSafe>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Text style={styles.header}>Edit motor</Text>
            <MotorField label="Name" value={name} onChangeText={setName} placeholder="Motor name" />
            <MotorField label="Type" value={type} onChangeText={setType} placeholder="Motor type" />
            <MotorField
              label="Price per day (₱)"
              value={price}
              onChangeText={setPrice}
              placeholder="Price"
              keyboardType="decimal-pad"
            />
            <MotorField
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the motor"
              multiline
            />
            <MotorField
              label="Image URL"
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/motor.jpg"
              keyboardType="url"
            />
            <SubmitButton title="SAVE CHANGES" onPress={handleSave} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MainSafe>
  );
}

type MotorFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
};

function MotorField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
}: MotorFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  content: { flexGrow: 1, padding: 24, paddingTop: 32, paddingBottom: 48 },
  notFound: { flex: 1, padding: 24, paddingTop: 32, gap: 24 },
  back: { color: '#21484a', fontSize: 16, fontWeight: '600' },
  form: { gap: 16, paddingVertical: 32 },
  header: { color: '#0f172a', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  field: { gap: 6 },
  label: { color: '#334155', fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: { minHeight: 110 },
});
