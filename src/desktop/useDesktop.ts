import { createContext, useContext } from 'react';
import type { Action, DesktopState } from './windowManager';

export type DesktopContextValue = DesktopState & {
  compact: boolean;
  /** Apply an action. The address bar stays at the site root. */
  run: (action: Action) => void;
  /** Apply an action with no other side effects. Used for drags and icon selection. */
  dispatch: (action: Action) => void;
};

export const DesktopContext = createContext<DesktopContextValue | null>(null);

export function useDesktop(): DesktopContextValue {
  const value = useContext(DesktopContext);
  if (!value) throw new Error('useDesktop must be used inside DesktopProvider');
  return value;
}
