import { useEffect } from 'react';

/**
 * Hook to run an effect only once when the component mounts.
 * Use this as an explicit escape hatch for synchronizing with external systems.
 */
export function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}
