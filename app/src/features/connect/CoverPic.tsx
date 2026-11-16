import { useState } from 'react';
import { Image } from 'react-native';
import { communityPhoto } from './photos';

/** A community's picture: its own cover, or a photo that fits what it does if it has none or cannot be loaded. */
export function CoverPic({ c, size = 76, radius = 14 }: { c: { name: string; cover_url: string | null }; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false);
  return <Image source={communityPhoto(c, failed)} onError={() => setFailed(true)} accessibilityIgnoresInvertColors style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#FAECE5' }} />;
}
