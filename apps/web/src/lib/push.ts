/**
 * The Push API wants the VAPID application server key as a Uint8Array, but it
 * is distributed as a base64url string, so it has to be decoded by hand.
 *
 * The return type is pinned to `Uint8Array<ArrayBuffer>` rather than the
 * default `ArrayBufferLike`: since TypeScript 5.7 the array is generic over
 * its buffer, and `applicationServerKey` will not accept one that might be
 * backed by a SharedArrayBuffer.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);

  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * iOS delivers web push only to sites installed to the Home Screen, and only
 * on 16.4+. Detecting standalone display mode is how we tell whether the user
 * still needs to install before the permission prompt will do anything.
 */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
