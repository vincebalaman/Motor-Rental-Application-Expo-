import { useRef, useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import { MotorFormButton, motorFormStyles as styles } from '@/components/motor-form';
import { pickMotorPhoto } from '@/services/motor-photo-picker';
import { photoBytes, type MotorPhoto } from '@/services/motor-photos';

export function MotorPhotoInput({ photo, currentUrl, onChange, disabled, onBusyChange, profile = false }: {
  photo: MotorPhoto | null; currentUrl?: string; onChange: (photo: MotorPhoto | null) => void;
  profile?: boolean; disabled: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selecting = useRef(false);
  const choose = async (camera: boolean) => {
    if (disabled || selecting.current) return;
    selecting.current = true; setBusy(true); onBusyChange(true); setError(null);
    try {
      const result = await pickMotorPhoto(camera);
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
      const context = ImageManipulator.manipulate(asset.uri);
      try {
        if (asset.width > 2048 || asset.height > 2048) context.resize(asset.width >= asset.height ? { width: 2048 } : { height: 2048 });
        const image = await context.renderAsync();
        try {
          const output = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
          photoBytes(output.base64 ?? '');
          const { randomUUID } = await import('expo-crypto');
          onChange({ id: randomUUID(), uri: output.uri, base64: output.base64! });
        } finally { image.release(); }
      } finally { context.release(); }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(message.includes('native module') ? 'Photo tools are unavailable in this build. Update Expo Go or rebuild the development app.' : message || 'We could not open that photo. Please try another image.');
    } finally { selecting.current = false; setBusy(false); onBusyChange(false); }
  };
  const uri = photo?.uri || currentUrl;
  return <View style={{ gap: 12 }}>
    {uri ? <Image source={{ uri }} accessibilityLabel={profile ? "Profile photo preview" : "Motor photo preview"} style={{ width: '100%', aspectRatio: profile ? 1 : 1.5, maxWidth: profile ? 180 : undefined, alignSelf: 'center', borderRadius: profile ? 90 : 12, backgroundColor: '#eef1eb' }} resizeMode="cover" /> : <View style={{ padding: 32, borderRadius: 12, backgroundColor: '#eef1eb' }}><Text style={styles.subtitle}>{profile ? 'Choose a photo for your profile.' : 'Add a clear photo of this motor.'}</Text></View>}
    <MotorFormButton title={uri ? 'Choose another photo' : 'Choose a photo'} tone="outline" busy={disabled || busy} onPress={() => void choose(false)} />
    {Platform.OS !== 'web' && <MotorFormButton title="Take a photo" tone="outline" busy={disabled || busy} onPress={() => void choose(true)} />}
    {photo && <MotorFormButton title={currentUrl ? 'Keep current photo' : 'Remove selection'} tone="outline" busy={disabled || busy} onPress={() => onChange(null)} />}
    <Text style={styles.hint}>{busy ? 'Preparing your photo…' : photo ? 'New photo selected. It will upload when you save.' : profile ? 'Your photo is private to your account.' : 'One photo per motor. Photos are resized automatically.'}</Text>
    {error && <Text accessibilityRole="alert" style={styles.saveError}>{error}</Text>}
  </View>;
}
