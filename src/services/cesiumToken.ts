export async function getCesiumIonToken(): Promise<string> {
  // Check if injected via window or vite env
  if (typeof window !== 'undefined' && (window as any).__CESIUM_ION_TOKEN__) {
    return (window as any).__CESIUM_ION_TOKEN__;
  }

  // Check import.meta.env
  const metaEnvToken = (import.meta as any).env?.VITE_CESIUM_ION_TOKEN || (import.meta as any).env?.CESIUM_ION_TOKEN;
  if (metaEnvToken) {
    return metaEnvToken;
  }

  // Otherwise fetch from server-side proxy endpoint
  try {
    const res = await fetch('/api/cesium-token');
    if (res.ok) {
      const data = await res.json();
      if (data && data.token) {
        return data.token;
      }
    }
  } catch (e) {
    console.warn('[CesiumToken] Could not fetch token from /api/cesium-token:', e);
  }

  return '';
}
