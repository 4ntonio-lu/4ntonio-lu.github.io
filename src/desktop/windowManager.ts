export type WindowState = {
  id: string;
  minimized: boolean;
  maximized: boolean;
  z: number;
  x: number;
  y: number;
};

export type DesktopState = {
  windows: WindowState[];
  focusedId: string | null;
  selectedId: string | null;
  topZ: number;
  /** How many windows have been opened. New windows cascade from this, even after a close. */
  cascade: number;
};

export type Action =
  | { type: 'open'; id: string; x?: number; y?: number }
  | { type: 'close'; id: string }
  | { type: 'minimize'; id: string }
  | { type: 'toggleMaximize'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'taskbar'; id: string }
  | { type: 'select'; id: string | null };

/** Matches `@media (max-width: 767px)` in index.css, one pixel under Tailwind's `md`. */
export const COMPACT_MAX_WIDTH = 767;

/** Clears two columns of desktop icons, so a wrapped icon stays visible beside a new window. */
export const CASCADE_ORIGIN_X = 216;
export const CASCADE_ORIGIN_Y = 16;
export const CASCADE_STEP = 26;

/** Wide enough for Today and Week to sit side by side, as in the weather draft. */
export const WEATHER_WINDOW_WIDTH = 0.48;

/**
 * Below this, weather, crypto, and stocks are pulled fully on screen.
 * 1280 and wider keep the fullscreen placement.
 */
export const NARROW_DESKTOP_MAX = 1279;

const NARROW_APPS = new Set(['weather', 'crypto', 'stocks']);

/** Weather's top row needs this much window width once the viewport gets narrow. */
const NARROW_WEATHER_WIDTH = 600;

/**
 * Fit weather, crypto, and stocks inside a desktop that is wider than a phone
 * and narrower than fullscreen. Returns null when the fullscreen or phone layout applies.
 */
export function narrowWindowFrame(input: {
  appId: string;
  viewportWidth: number;
  viewportHeight: number;
  taskbarHeight: number;
  widthRatio: number;
  x: number;
  y: number;
}): { width: number; x: number; y: number } | null {
  if (input.viewportWidth <= COMPACT_MAX_WIDTH || input.viewportWidth > NARROW_DESKTOP_MAX) {
    return null;
  }
  if (!NARROW_APPS.has(input.appId)) return null;

  const margin = 8;
  const maxWidth = Math.max(260, input.viewportWidth - margin * 2);
  let width = input.widthRatio * input.viewportWidth;
  if (input.appId === 'weather') width = Math.max(width, NARROW_WEATHER_WIDTH);
  width = Math.round(Math.min(width, maxWidth));
  const x = Math.max(margin, Math.min(input.x, input.viewportWidth - width - margin));
  const available = input.viewportHeight - input.taskbarHeight;
  const minHeight = input.appId === 'weather' ? 420 : 320;
  let y = input.y;
  if (y + minHeight > available - margin) {
    y = Math.max(margin, available - minHeight - margin);
  }
  return { width, x, y };
}

/**
 * Weather opens beside About when the desktop is wide enough, and below it
 * otherwise, so the two windows do not stack.
 */
export function weatherWindowOrigin(input: {
  desktopWidth: number;
  weatherWidth: number;
  about: { top: number; right: number; bottom: number } | null;
}): { x: number; y: number } {
  if (!input.about) return { x: CASCADE_ORIGIN_X, y: CASCADE_ORIGIN_Y };
  const gap = 12;
  const beside = input.about.right + gap;
  if (beside + input.weatherWidth <= input.desktopWidth - 8) {
    return { x: beside, y: Math.max(8, input.about.top) };
  }
  return { x: CASCADE_ORIGIN_X, y: input.about.bottom + gap };
}

const CASCADE_SLOTS = 8;

export const initialDesktopState: DesktopState = {
  windows: [],
  focusedId: null,
  selectedId: null,
  topZ: 0,
  cascade: 0,
};

export function createInitialState(openId: string | null): DesktopState {
  if (!openId) return initialDesktopState;
  return desktopReducer(initialDesktopState, { type: 'open', id: openId });
}

function topVisible(windows: WindowState[]): string | null {
  const top = windows
    .filter((window) => !window.minimized)
    .reduce<WindowState | null>(
      (best, window) => (!best || window.z > best.z ? window : best),
      null,
    );
  return top?.id ?? null;
}

/** Raise a window, restore it if it was minimized, and give it keyboard focus. */
function focusWindow(state: DesktopState, id: string): DesktopState {
  const existing = state.windows.find((window) => window.id === id);
  if (!existing) return state;
  if (!existing.minimized && state.focusedId === id && existing.z === state.topZ) return state;

  const topZ = state.topZ + 1;
  return {
    ...state,
    topZ,
    focusedId: id,
    windows: state.windows.map((window) =>
      window.id === id ? { ...window, z: topZ, minimized: false } : window,
    ),
  };
}

function minimize(state: DesktopState, id: string): DesktopState {
  if (!state.windows.some((window) => window.id === id)) return state;
  const windows = state.windows.map((window) =>
    window.id === id ? { ...window, minimized: true } : window,
  );
  const focusedId = state.focusedId === id ? topVisible(windows) : state.focusedId;
  return { ...state, windows, focusedId };
}

export function desktopReducer(state: DesktopState, action: Action): DesktopState {
  switch (action.type) {
    case 'select':
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id };

    case 'open': {
      const existing = state.windows.find((window) => window.id === action.id);
      if (existing) return focusWindow({ ...state, selectedId: action.id }, action.id);

      const slot = state.cascade % CASCADE_SLOTS;
      const topZ = state.topZ + 1;
      const window: WindowState = {
        id: action.id,
        minimized: false,
        maximized: false,
        z: topZ,
        x: action.x ?? CASCADE_ORIGIN_X + slot * CASCADE_STEP,
        y: action.y ?? CASCADE_ORIGIN_Y + slot * CASCADE_STEP,
      };
      return {
        ...state,
        topZ,
        cascade: state.cascade + 1,
        focusedId: action.id,
        selectedId: action.id,
        windows: [...state.windows, window],
      };
    }

    case 'close': {
      if (!state.windows.some((window) => window.id === action.id)) return state;
      const windows = state.windows.filter((window) => window.id !== action.id);
      const focusedId = state.focusedId === action.id ? topVisible(windows) : state.focusedId;
      return { ...state, windows, focusedId };
    }

    case 'minimize':
      return minimize(state, action.id);

    case 'toggleMaximize': {
      if (!state.windows.some((window) => window.id === action.id)) return state;
      const toggled: DesktopState = {
        ...state,
        windows: state.windows.map((window) =>
          window.id === action.id
            ? { ...window, maximized: !window.maximized, minimized: false }
            : window,
        ),
      };
      return focusWindow(toggled, action.id);
    }

    case 'focus':
      return focusWindow(state, action.id);

    case 'move':
      return {
        ...state,
        windows: state.windows.map((window) =>
          window.id === action.id && !window.maximized
            ? { ...window, x: action.x, y: action.y }
            : window,
        ),
      };

    case 'taskbar': {
      const window = state.windows.find((item) => item.id === action.id);
      if (!window) return state;
      // The focused window's taskbar button minimizes it. Any other button restores and focuses.
      if (state.focusedId === action.id && !window.minimized) return minimize(state, action.id);
      return focusWindow(state, action.id);
    }

    default:
      return state;
  }
}
