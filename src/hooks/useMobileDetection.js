import { useEffect, useState } from 'react';

/**
 * Hook to detect if device is mobile
 * Uses screen size to determine mobile status
 * Mobile: width <= 768px
 */
export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial state
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setLoading(false);
    };

    // Initial check
    checkMobile();

    // Listen to window resize
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isMobile, loading };
};

/**
 * Alternative method: detect based on user agent
 */
export const useUserAgentMobileDetection = () => {
  const [isMobile] = useState(() => {
    if (typeof navigator === 'undefined') return false;

    const userAgent = navigator.userAgent || '';
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent);
  });

  return isMobile;
};

/**
 * Combined detection: use both methods
 * Returns true if EITHER screen size indicates mobile OR user agent indicates mobile device
 */
export const useCombinedMobileDetection = () => {
  const { isMobile: screenMobile } = useMobileDetection();
  const userAgentMobile = useUserAgentMobileDetection();

  return screenMobile || userAgentMobile;
};
