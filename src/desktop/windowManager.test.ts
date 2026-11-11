import { describe, expect, it } from 'vitest';
import {
  CASCADE_ORIGIN_X,
  CASCADE_ORIGIN_Y,
  CASCADE_STEP,
  createInitialState,
  desktopReducer,
  initialDesktopState,
  type DesktopState,
} from './windowManager';

function open(state: DesktopState, id: string) {
  return desktopReducer(state, { type: 'open', id });
}

describe('desktopReducer', () => {
  it('opens windows in a cascade and focuses the newest one', () => {
    const about = open(initialDesktopState, 'about');
    const projects = open(about, 'projects');

    expect(projects.windows.map((window) => window.id)).toEqual(['about', 'projects']);
    expect(projects.focusedId).toBe('projects');
    expect(projects.windows[1].z).toBeGreaterThan(projects.windows[0].z);
    expect(projects.windows[0]).toMatchObject({ x: CASCADE_ORIGIN_X, y: CASCADE_ORIGIN_Y });
    expect(projects.windows[1]).toMatchObject({
      x: CASCADE_ORIGIN_X + CASCADE_STEP,
      y: CASCADE_ORIGIN_Y + CASCADE_STEP,
    });
  });

  it('focuses an open window instead of duplicating it, and keeps its position', () => {
    const state = open(open(initialDesktopState, 'about'), 'projects');
    const again = open(state, 'about');

    expect(again.windows).toHaveLength(2);
    expect(again.focusedId).toBe('about');
    expect(again.windows[0].z).toBeGreaterThan(again.windows[1].z);
    expect(again.windows[0]).toMatchObject({ x: CASCADE_ORIGIN_X, y: CASCADE_ORIGIN_Y });
  });

  it('minimizes without closing, then restores the previous size from the taskbar', () => {
    const openBoth = open(open(initialDesktopState, 'about'), 'projects');
    const minimized = desktopReducer(openBoth, { type: 'taskbar', id: 'projects' });

    expect(minimized.windows.map((window) => window.id)).toEqual(['about', 'projects']);
    expect(minimized.windows[1].minimized).toBe(true);
    expect(minimized.focusedId).toBe('about');

    const restored = desktopReducer(minimized, { type: 'taskbar', id: 'projects' });
    expect(restored.windows[1].minimized).toBe(false);
    expect(restored.focusedId).toBe('projects');
  });

  it('remembers that a minimized window was maximized', () => {
    const maximized = desktopReducer(open(initialDesktopState, 'about'), {
      type: 'toggleMaximize',
      id: 'about',
    });
    const minimized = desktopReducer(maximized, { type: 'minimize', id: 'about' });
    const restored = desktopReducer(minimized, { type: 'focus', id: 'about' });

    expect(restored.windows[0]).toMatchObject({ minimized: false, maximized: true });
  });

  it('closes a window and focuses the next one that is still on screen', () => {
    let state = open(open(open(initialDesktopState, 'about'), 'resume'), 'projects');
    state = desktopReducer(state, { type: 'minimize', id: 'resume' });
    state = desktopReducer(state, { type: 'close', id: 'projects' });

    expect(state.windows.map((window) => window.id)).toEqual(['about', 'resume']);
    expect(state.focusedId).toBe('about');
  });

  it('leaves no focused window when the last visible one closes', () => {
    const state = desktopReducer(open(initialDesktopState, 'about'), {
      type: 'close',
      id: 'about',
    });
    expect(state.windows).toEqual([]);
    expect(state.focusedId).toBeNull();
  });

  it('moves a normal window and ignores moves while maximized', () => {
    const moved = desktopReducer(open(initialDesktopState, 'about'), {
      type: 'move',
      id: 'about',
      x: 40,
      y: 50,
    });
    expect(moved.windows[0]).toMatchObject({ x: 40, y: 50 });

    const maximized = desktopReducer(moved, { type: 'toggleMaximize', id: 'about' });
    const ignored = desktopReducer(maximized, { type: 'move', id: 'about', x: 1, y: 2 });
    expect(ignored.windows[0]).toMatchObject({ x: 40, y: 50, maximized: true });
  });

  it('tracks the selected desktop icon separately from the focused window', () => {
    const selected = desktopReducer(open(initialDesktopState, 'about'), {
      type: 'select',
      id: 'projects',
    });
    expect(selected.selectedId).toBe('projects');
    expect(selected.focusedId).toBe('about');
  });

  it('opens the requested app for a deep link and About for the site root', () => {
    expect(createInitialState('projects').focusedId).toBe('projects');
    expect(createInitialState('about').windows).toHaveLength(1);
    expect(createInitialState(null).windows).toHaveLength(0);
  });
});
