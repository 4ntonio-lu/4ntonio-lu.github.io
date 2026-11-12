import { useCallback, useEffect, useMemo, useReducer, type JSX, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useWindowDimensions from '../components/hooks/useWindowDimensions';
import { DesktopContext, type DesktopContextValue } from './useDesktop';
import {
  COMPACT_MAX_WIDTH,
  createInitialState,
  desktopReducer,
  type Action,
} from './windowManager';

export function DesktopProvider({
  children,
  initialOpen,
}: {
  children: ReactNode;
  /** Tests mount one window directly. Leave this unset so the first visit to "/" opens About. */
  initialOpen?: string | null;
}): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const openOnLoad =
    initialOpen !== undefined ? initialOpen : location.pathname === '/' ? 'about' : null;
  const [state, dispatch] = useReducer(desktopReducer, openOnLoad, createInitialState);
  const { windowWidth } = useWindowDimensions();
  const compact = windowWidth <= COMPACT_MAX_WIDTH;

  // An old per-app address still loads the site, then the bar returns to the root.
  // It does not open that app.
  useEffect(() => {
    if (location.pathname !== '/') navigate('/', { replace: true });
  }, [location.pathname, navigate]);

  const run = useCallback((action: Action) => {
    dispatch(action);
  }, []);

  const value = useMemo<DesktopContextValue>(
    () => ({ ...state, compact, run, dispatch }),
    [state, compact, run, dispatch],
  );

  return <DesktopContext.Provider value={value}>{children}</DesktopContext.Provider>;
}
