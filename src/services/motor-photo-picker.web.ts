import { launchCameraAsync, launchImageLibraryAsync } from 'expo-image-picker';
// Open the browser picker within the original click event, before any await.
export function pickMotorPhoto(camera: boolean) {
  const options = { mediaTypes: ['images'] as ('images')[], quality: 1, allowsMultipleSelection: false };
  return camera ? launchCameraAsync(options) : launchImageLibraryAsync(options);
}
