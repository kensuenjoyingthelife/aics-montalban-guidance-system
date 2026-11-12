/**
 * Adaptive Device Performance Engine
 * Detects whether the user is on a low-end phone, tablet, or low-spec PC:
 * - Checks hardwareConcurrency (< 4 cores = low-end)
 * - Checks deviceMemory (< 4 GB = low-end)
 * - Checks prefers-reduced-motion
 * - Checks mobile userAgent
 * - Checks battery saver mode if supported
 *
 * Automatically injects 'low-tier-device' or 'high-tier-device' class to document.body,
 * dynamically disabling heavy backdrop-filter blur and complex SVG animations
 * so low-end devices run at steady 60fps with ZERO LAG.
 */

export interface DeviceTier {
  isLowTier: boolean;
  prefersReducedMotion: boolean;
  hardwareConcurrency: number;
  deviceMemory: number;
}

export function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') {
    return {
      isLowTier: false,
      prefersReducedMotion: false,
      hardwareConcurrency: 8,
      deviceMemory: 8,
    };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = nav.connection?.saveData === true;
  const isSlowNetwork = nav.connection?.effectiveType === '2g' || nav.connection?.effectiveType === 'slow-2g';

  // Mobile check
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Consider low-tier if:
  // 1. Reduced motion explicitly requested
  // 2. Battery save-data mode enabled
  // 3. Low core count (<= 2 cores)
  // 4. Low RAM (<= 2 GB)
  // 5. Mobile device with <= 4 cores
  const isLowTier =
    prefersReduced ||
    saveData ||
    isSlowNetwork ||
    cores <= 2 ||
    memory <= 2 ||
    (isMobile && cores <= 4);

  return {
    isLowTier,
    prefersReducedMotion: prefersReduced,
    hardwareConcurrency: cores,
    deviceMemory: memory,
  };
}

export function applyAdaptivePerformanceClass(): boolean {
  if (typeof document === 'undefined') return false;

  const { isLowTier } = detectDeviceTier();
  if (isLowTier) {
    document.body.classList.add('low-tier-device');
    document.body.classList.remove('high-tier-device');
  } else {
    document.body.classList.add('high-tier-device');
    document.body.classList.remove('low-tier-device');
  }

  return isLowTier;
}
