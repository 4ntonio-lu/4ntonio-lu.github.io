import { createContext, useContext } from 'react';
import type { Action, DesktopState } from './windowManager';

export type DesktopContextValue = DesktopState & {
  compact: boolean;
  /** Apply an action and point the URL at the focused window. */
  run: (action: Action) => void;
  /** Apply an action without touching the URL. Used for drags and for browser history. */
  dispatch: (action: Action) => void;
};

export const DesktopContext = createContext<DesktopContextValue | null>(null);

export function useDesktop(): DesktopContextValue {
  const value = useContext(DesktopContext);
  if (!value) throw new Error('useDesktop must be used inside DesktopProvider');
  return value;
}
