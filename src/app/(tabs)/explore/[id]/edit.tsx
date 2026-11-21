import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { type Motor, inventoryErrorMessage } from '@/services/inventory';

export default function EditMotorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const motorId = Array.isArray(id) ? id[0] : id;
  const { motors, loading, error, retry } = useMotorInventory();
  const motor = motors.find(item => item.id === motorId);
  if (!motor) return <MainSafe><ScrollView contentContainerStyle={styles.content}>
    <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/explore')} accessibilityRole="button"><Text style={styles.back}>← Back</Text></TouchableOpacity>
    {loading ? <ActivityIndicator color="#21484a" accessibilityLabel="Loading motor" /> : <View style={styles.panel}><Text style={styles.sectionTitle}>{error ? 'Unable to load motor' : 'Motor not available'}</Text><Text accessibilityRole={error ? 'alert' : undefined} style={styles.subtitle}>{error || 'This motor is no longer listed. Return to the inventory and refresh.'}</Text>{error && <MotorFormButton title="Try again" onPress={retry} tone="outline" />}</View>}
  </ScrollView></MainSafe>;
  return <EditMotorForm key={motor.id} motor={motor} motorId={motor.id} />;
}
function EditMotorForm({ motor, motorId }: { motor: Motor; motorId: string }) {
  const { updateMotor } = useMotorInventory();
  const [originalUpdatedAt] = useState(motor.updatedAt);
  const [name, setName] = useState(motor.name);
  const [type, setType] = useState(motor.type);
  const [price, setPrice] = useState(String(motor.price));
  const [description, setDescription] = useState(motor.description);
  const [imagePath, setImagePath] = useState(motor.imagePath);
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

          <Text accessibilityRole="header" style={styles.header}>Edit motor</Text>
          <Text style={styles.subtitle}>Update this motor’s listing and daily rate.</Text>
          <View style={styles.form}>
            <View style={styles.panel}><Text style={styles.sectionTitle}>Motor details</Text>
            <MotorField editable={!isSubmitting} label="Motor name" maxLength={120} value={name} onChangeText={setName} placeholder="Motor name" />
            <MotorField editable={!isSubmitting} label="Motor type" maxLength={60} value={type} onChangeText={setType} placeholder="Motor type" />
            <MotorField
              editable={!isSubmitting}
              label="Daily rate (₱)"
              hint="The base price for one 24-hour rental day."
              value={price}
              onChangeText={setPrice}
              placeholder="Price"
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
            <MotorFormButton title="Save changes" onPress={handleSave} busy={isSubmitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MainSafe>
  );
}
