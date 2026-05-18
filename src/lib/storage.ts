import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadDrillImage(
  userId: string,
  drillId: string,
  dataUrl: string
): Promise<string> {
  const storageRef = ref(storage, `drills/${userId}/${drillId}.png`);
  await uploadString(storageRef, dataUrl, 'data_url');
  return getDownloadURL(storageRef);
}
