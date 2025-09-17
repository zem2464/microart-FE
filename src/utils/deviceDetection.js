// Stub for device detection utility
export async function getDeviceRegistrationInfo() {
  // Return minimal device info for now
  return {
    deviceName: navigator.userAgent,
    deviceType: 'web',
    browser: navigator.userAgent,
    operatingSystem: navigator.platform,
    userAgent: navigator.userAgent,
    deviceFingerprint: '',
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth || 24,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    plugins: [],
    canvas: '',
    webgl: '',
    audio: '',
    ipAddress: '',
    location: '',
    notes: '',
  };
}
