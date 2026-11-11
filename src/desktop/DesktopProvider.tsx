import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type JSX,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useWindowDimensions from '../components/hooks/useWindowDimensions';
import { appById, appByPath } from './apps';
import { DesktopContext, type DesktopContextValue } from './useDesktop';
import {
  COMPACT_MAX_WIDTH,
  createInitialState,
  desktopReducer,
  type Action,
} from './windowManager';

function initialWindowId(pathname: string): string | null {
  return appByPath(pathname)?.id ?? (pathname === '/' ? 'about' : null);
}

export function DesktopProvider({ children }: { children: ReactNode }): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(desktopReducer, location.pathname, (pathname: string) =>
    createInitialState(initialWindowId(pathname)),
  );
  const { windowWidth } = useWindowDimensions();
  const compact = windowWidth <= COMPACT_MAX_WIDTH;

  // Browser Back and Forward should move focus. Clicks update the URL themselves,
  // so this only reacts to a popstate and never pushes a second history entry.
  const fromHistory = useRef(false);
  useEffect(() => {
    const markHistory = () => {
      fromHistory.current = true;
    };
    window.addEventListener('popstate', markHistory);
    return () => window.removeEventListener('popstate', markHistory);
  }, []);

  useEffect(() => {
    if (!fromHistory.current) return;
    fromHistory.current = false;
    const app = appByPath(location.pathname);
    if (app) dispatch({ type: 'open', id: app.id });
  }, [location.pathname, dispatch]);

  // The first visit to "/" opens About, and the address bar should say so.
  // Closing the last window returns to "/" and must leave the desktop empty.
  const redirectInitialRoot = useRef(location.pathname === '/');
  const focusedPath = appById(state.focusedId)?.path ?? null;
  useEffect(() => {
    if (!redirectInitialRoot.current || !focusedPath) return;
    redirectInitialRoot.current = false;
    navigate(focusedPath, { replace: true });
  }, [focusedPath, navigate]);

  const run = useCallback(
    (action: Action) => {
      const next = desktopReducer(state, action);
      dispatch(action);
      const path = appById(next.focusedId)?.path ?? '/';
      if (path !== location.pathname) navigate(path);
    },
    [location.pathname, navigate, state],
  );

  const value = useMemo<DesktopContextValue>(
    () => ({ ...state, compact, run, dispatch }),
    [state, compact, run, dispatch],
  );

  return <DesktopContext.Provider value={value}>{children}</DesktopContext.Provider>;
}
