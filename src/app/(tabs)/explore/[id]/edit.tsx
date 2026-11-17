import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
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
import { inventoryErrorMessage } from '@/services/inventory';

export default function EditMotorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const motorId = Array.isArray(id) ? id[0] : id;
  const { motors, updateMotor } = useMotorInventory();
  const motor = motors.find((item) => item.id === motorId);
  const [originalUpdatedAt] = useState(motor?.updatedAt ?? '');
  const [name, setName] = useState(motor?.name ?? '');
  const [type, setType] = useState(motor?.type ?? '');
  const [price, setPrice] = useState(motor ? String(motor.price) : '');
  const [description, setDescription] = useState(motor?.description ?? '');
  const [imagePath, setImagePath] = useState(motor?.imagePath ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const submitting = useRef(false);

  const handleSave = async () => {
    if (submitting.current) return;
    setSaveError(null);
    const parsedPrice = Number(price.trim());
    if (!motor || !motorId) {
      setSaveError('This motor is no longer available.');
      return;
    }
    if (!name.trim() || !type.trim() || !description.trim() || !price.trim() || !imagePath.trim()) {
      setSaveError('Please complete all motor details.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setSaveError('Enter a price greater than zero.');
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    setSaveError(null);
    try {
      await updateMotor(motorId, {
        name: name.trim(),
        type: type.trim(),
        price: parsedPrice,
        description: description.trim(),
        imagePath: imagePath.trim(),
      }, originalUpdatedAt);
      router.replace({
        pathname: '/(tabs)/explore/[id]',
        params: { id: String(motorId) },
      });
    } catch (error) {
      setSaveError(inventoryErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  if (!motor) {
    return (
      <MainSafe>
        <View style={styles.notFound}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/explore')} accessibilityRole="button">
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
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/explore')} accessibilityRole="button">
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.form}>
            <Text style={styles.header}>Edit motor</Text>
            <MotorField editable={!isSubmitting} label="Name" value={name} onChangeText={setName} placeholder="Motor name" />
            <MotorField editable={!isSubmitting} label="Type" value={type} onChangeText={setType} placeholder="Motor type" />
            <MotorField
              editable={!isSubmitting}
              label="Price per day (₱)"
              value={price}
              onChangeText={setPrice}
              placeholder="Price"
              keyboardType="decimal-pad"
            />
            <MotorField
              editable={!isSubmitting}
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the motor"
              multiline
            />
            <MotorField
              editable={!isSubmitting}
              label="Image URL or storage path"
              value={imagePath}
              onChangeText={setImagePath}
              placeholder="https://example.com/motor.jpg or motors/photo.jpg"
              keyboardType="url"
            />
            {saveError && <Text accessibilityRole="alert" style={styles.saveError}>{saveError}</Text>}
            <SubmitButton title="SAVE CHANGES" onPress={handleSave} isSubmitting={isSubmitting} />
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
  editable?: boolean;
};

function MotorField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  editable = true,
}: MotorFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        editable={editable}
        autoCapitalize={keyboardType === 'url' ? 'none' : 'sentences'}
        autoCorrect={keyboardType !== 'url'}
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
  saveError: { color: '#991b1b', fontSize: 14, lineHeight: 21 },
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
