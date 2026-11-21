import type { ImagePickerResult } from 'expo-image-picker';
export async function pickMotorPhoto(camera: boolean): Promise<ImagePickerResult> {
  const picker = await import('expo-image-picker');
  if (camera) {
    const permission = await picker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Allow camera access in your device settings to take a photo, or choose one from your library.');
  }
  const options = { mediaTypes: ['images'] as ('images')[], quality: 1, allowsMultipleSelection: false };
  return camera ? picker.launchCameraAsync(options) : picker.launchImageLibraryAsync(options);
}
