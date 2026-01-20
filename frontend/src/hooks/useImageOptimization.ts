import { useState, useEffect } from 'react';

interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  saveData: boolean;
  downlink: number;
  rtt: number;
}

interface UseImageOptimizationOptions {
  respectSaveData?: boolean;
  adaptToConnection?: boolean;
}

/**
 * Custom hook for connection-aware image optimization
 *
 * Returns optimal image settings based on network conditions
 */
export const useImageOptimization = (options: UseImageOptimizationOptions = {}) => {
  const { respectSaveData = true, adaptToConnection = true } = options;

  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    effectiveType: '4g',
    saveData: false,
    downlink: 10,
    rtt: 50
  });

  useEffect(() => {
    // Check if Network Information API is available
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      const conn = (navigator as any).connection ||
                   (navigator as any).mozConnection ||
                   (navigator as any).webkitConnection;

      const updateConnectionInfo = () => {
        setConnectionInfo({
          effectiveType: conn.effectiveType || '4g',
          saveData: conn.saveData || false,
          downlink: conn.downlink || 10,
          rtt: conn.rtt || 50
        });
      };

      // Initial update
      updateConnectionInfo();

      // Listen for changes
      conn.addEventListener('change', updateConnectionInfo);

      return () => {
        conn.removeEventListener('change', updateConnectionInfo);
      };
    }
  }, []);

  // Determine optimal image quality based on connection
  const getImageQuality = (): 'high' | 'medium' | 'low' => {
    if (respectSaveData && connectionInfo.saveData) {
      return 'low';
    }

    if (!adaptToConnection) {
      return 'high';
    }

    switch (connectionInfo.effectiveType) {
      case '4g':
        return 'high';
      case '3g':
        return 'medium';
      case '2g':
      case 'slow-2g':
        return 'low';
      default:
        return 'medium';
    }
  };

  // Get optimal image size based on quality
  const getOptimalImageSize = (baseWidth: number = 1024): string => {
    const quality = getImageQuality();
    const aspectRatio = 0.75; // 4:3 ratio

    switch (quality) {
      case 'high':
        return `${baseWidth}x${Math.round(baseWidth * aspectRatio)}`;
      case 'medium':
        return `${Math.round(baseWidth * 0.6)}x${Math.round(baseWidth * 0.6 * aspectRatio)}`;
      case 'low':
        return `${Math.round(baseWidth * 0.4)}x${Math.round(baseWidth * 0.4 * aspectRatio)}`;
    }
  };

  // Should lazy load images
  const shouldLazyLoad = (): boolean => {
    if (respectSaveData && connectionInfo.saveData) {
      return true;
    }
    return connectionInfo.effectiveType === '2g' || connectionInfo.effectiveType === 'slow-2g';
  };

  // Get optimal loading strategy
  const getLoadingStrategy = (): 'eager' | 'lazy' => {
    return shouldLazyLoad() ? 'lazy' : 'eager';
  };

  // Determine if should preload images
  const shouldPreload = (): boolean => {
    if (respectSaveData && connectionInfo.saveData) {
      return false;
    }
    return connectionInfo.effectiveType === '4g' || connectionInfo.effectiveType === '3g';
  };

  // Get number of images to preload
  const getPreloadCount = (): number => {
    if (!shouldPreload()) return 0;

    const quality = getImageQuality();
    switch (quality) {
      case 'high':
        return 10;
      case 'medium':
        return 5;
      case 'low':
        return 2;
    }
  };

  return {
    connectionInfo,
    imageQuality: getImageQuality(),
    optimalImageSize: getOptimalImageSize,
    shouldLazyLoad: shouldLazyLoad(),
    loadingStrategy: getLoadingStrategy(),
    shouldPreload: shouldPreload(),
    preloadCount: getPreloadCount(),
    isSlowConnection: connectionInfo.effectiveType === '2g' || connectionInfo.effectiveType === 'slow-2g',
    isSaveDataEnabled: connectionInfo.saveData
  };
};

export default useImageOptimization;
