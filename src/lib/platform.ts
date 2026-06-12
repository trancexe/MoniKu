/**
 * Deteksi apakah app berjalan sebagai PWA standalone di iOS.
 * 
 * Konteks: Google GIS initTokenClient pakai window.open + postMessage
 * untuk mengembalikan token ke caller. Di iOS standalone PWA, Safari
 * sering gagal mengirim postMessage kembali ke PWA context setelah
 * OAuth popup dibuka.
 * 
 * Referensi: WebKit bug tracker, multiple open WebKit issues
 * sejak 2020 tentang PWA + popup/postMessage interop.
 */
export function isIOSPWA(): boolean {
  if (typeof window === "undefined") return false;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) 
    && !("MSStream" in window);
  
  const isStandalone = 
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  
  return isIOS && isStandalone;
}

/**
 * Deteksi apakah third-party cookie blocked.
 * GIS butuh cookie untuk menyimpan CSRF state. Safari ITP 
 * dan Chrome 3rd-party cookie block sering jadi silent failure.
 */
export function are3rdPartyCookiesBlocked(): boolean {
  // Heuristic: cek apakah navigator.cookieEnabled && Storage API
  // lebih reliable: coba set cookie dan baca balik
  if (typeof document === "undefined") return false;
  
  // Test 1: cek SameSite=None cookie support (simplified)
  try {
    const testKey = "__moniku_cookie_test__";
    document.cookie = `${testKey}=1; SameSite=None; Secure`;
    const has = document.cookie.includes(testKey);
    document.cookie = `${testKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    return !has;
  } catch {
    return true;  // assume blocked
  }
}
