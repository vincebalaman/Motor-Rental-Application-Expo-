import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MainSafe from '@/components/mainsafe';
import { MotorField, MotorFormButton, motorFormStyles as styles } from '@/components/motor-form';
import { useMotorInventory } from '@/context/MotorContext';
import { inventoryErrorMessage } from '@/services/inventory';

export default function CreateMotorScreen() {
  const { createMotor } = useMotorInventory();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const submitting = useRef(false);

  const handleCreate = async () => {
    if (submitting.current) return;
    setSaveError(null);
    const parsedPrice = Number(price.trim());
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
      const motor = await createMotor({
        name: name.trim(),
        type: type.trim(),
        price: parsedPrice,
        description: description.trim(),
        imagePath: imagePath.trim(),
      });
      router.replace({
        pathname: '/(tabs)/explore/[id]',
        params: { id: String(motor.id) },
      });
    } catch (error) {
      setSaveError(inventoryErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <MainSafe>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <TouchableOpacity disabled={isSubmitting} onPress={() => router.canGoBack() ? router.back() : router.replace('/explore')} accessibilityRole="button">
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          <Text accessibilityRole="header" style={styles.header}>Add a motor</Text>
          <Text style={styles.subtitle}>Create a listing for clients to explore.</Text>
          <View style={styles.form}>
            <View style={styles.panel}><Text style={styles.sectionTitle}>Motor details</Text>
            <MotorField editable={!isSubmitting} label="Motor name" maxLength={120} value={name} onChangeText={setName} placeholder="e.g. Yamaha NMAX" />
            <MotorField editable={!isSubmitting} label="Motor type" maxLength={60} value={type} onChangeText={setType} placeholder="e.g. Scooter" />
            <MotorField
              editable={!isSubmitting}
              label="Daily rate (₱)"
              hint="The base price for one 24-hour rental day."
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 1500"
              keyboardType="decimal-pad"
            />
            <MotorField
              editable={!isSubmitting}
              label="Description"
              maxLength={5000}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the motor"
              multiline
            />
            </View>
            <View style={styles.panel}><Text style={styles.sectionTitle}>Motor photo</Text>
            <MotorField
              editable={!isSubmitting}
              label="Image link or storage path"
              hint="Use an HTTPS image link or a path from the motor-images bucket."
              value={imagePath}
              onChangeText={setImagePath}
              placeholder="https://example.com/motor.jpg or motors/photo.jpg"
              keyboardType="url"
            />
            </View>
            {saveError && <Text accessibilityRole="alert" style={styles.saveError}>{saveError}</Text>}
            <MotorFormButton title="Create motor" onPress={handleCreate} busy={isSubmitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MainSafe>
  );
}
