import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardTypeOptions,
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

export default function CreateMotorScreen() {
  const { createMotor } = useMotorInventory();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleCreate = () => {
    const parsedPrice = Number(price.trim());
    if (!name.trim() || !type.trim() || !description.trim() || !price.trim() || !imageUrl.trim()) {
      Alert.alert('Missing fields', 'Please complete all motor details.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid price', 'Enter a price greater than zero.');
      return;
    }

    const motor = createMotor({
      name: name.trim(),
      type: type.trim(),
      price: parsedPrice,
      description: description.trim(),
      imageUrl: imageUrl.trim(),
    });
    router.replace({
      pathname: '/(tabs)/explore/[id]',
      params: { id: String(motor.id) },
    });
  };

  return (
    <MainSafe>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.header}>Add a motor</Text>
          <MotorField label="Name" value={name} onChangeText={setName} placeholder="e.g. Yamaha NMAX" />
          <MotorField label="Type" value={type} onChangeText={setType} placeholder="e.g. Scooter" />
          <MotorField
            label="Price per day (₱)"
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 1500"
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
          <SubmitButton title="CREATE MOTOR" onPress={handleCreate} />
        </View>
      </ScrollView>
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
  content: { flexGrow: 1, padding: 24, paddingTop: 32 },
  back: { color: '#21484a', fontSize: 16, fontWeight: '600' },
  form: { flex: 1, justifyContent: 'center', gap: 16, paddingVertical: 32 },
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
