import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { profile } from './content';
import { CASCADE_ORIGIN_Y, CASCADE_STEP } from './desktop/windowManager';

function Pathname() {
  const { pathname } = useLocation();
  return <div data-testid="path">{pathname}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Pathname />
      <App />
    </MemoryRouter>,
  );
}

const path = () => screen.getByTestId('path');

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

const desktop = () => within(screen.getByRole('navigation', { name: 'Desktop' }));
const taskbar = () => within(screen.getByRole('navigation', { name: 'Taskbar' }));

describe('App', () => {
  beforeEach(() => setWidth(1280));
  afterEach(() => setWidth(1280));

  it('opens the About window on the first visit and keeps the address bar at the site root', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: /I'm Antonio Lu/ })).toBeInTheDocument();
    expect(taskbar().getByRole('button', { name: 'About', pressed: true })).toBeInTheDocument();
    expect(path()).toHaveTextContent(/^\/$/);
  });

  it.each(['/about', '/resume', '/experiences', '/projects', '/crypto', '/stocks'])(
    'returns %s to the site root without opening that app',
    (entry) => {
      renderAt(entry);

      expect(path()).toHaveTextContent(/^\/$/);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

  it('shows a tab for each experience and switches between them', async () => {
    renderAt('/');
    await userEvent.dblClick(desktop().getByRole('button', { name: 'Experiences' }));

    expect(screen.getByRole('tab', { name: 'Charles Schwab', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Trimble' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Microchip' }));

    expect(screen.getByRole('tab', { name: 'Microchip', selected: true })).toBeInTheDocument();
    expect(screen.getByText('Full Stack Software Engineer Intern')).toBeVisible();
  });

  it('shows a tab for each project', async () => {
    renderAt('/');
    await userEvent.dblClick(desktop().getByRole('button', { name: 'Projects' }));

    for (const name of ['Portfolio', 'Ticket Tracker', 'Mind Kingdom']) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
  });

  it('embeds the resume PDF in a window that fills down to the taskbar', async () => {
    renderAt('/');
    await userEvent.dblClick(desktop().getByRole('button', { name: 'Resume' }));

    expect(screen.getByTitle('Resume PDF')).toHaveAttribute(
      'src',
      expect.stringMatching(/Resume\.pdf#navpanes=0&view=Fit$/),
    );
    const dialog = screen.getByRole('dialog', { name: 'Resume' });
    expect(dialog).toHaveStyle({
      width: '84%',
      height: `calc(100% - ${CASCADE_ORIGIN_Y + CASCADE_STEP}px)`,
    });
    expect(path()).toHaveTextContent(/^\/$/);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Maximize' }));
    expect(dialog).toHaveStyle({ width: '100%', height: '100%' });
  });

  it('stops moving a window after the pointer is released outside it', () => {
    renderAt('/');
    const dialog = screen.getByRole('dialog', { name: 'About' });
    const title = dialog.querySelector('.win95-title');
    if (!title) throw new Error('Missing title bar');

    act(() => {
      title.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: 200,
          clientY: 20,
        }),
      );
      title.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 200, clientY: 20 }),
      );
    });
    expect(document.body).toHaveClass('react-draggable-transparent-selection');

    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, buttons: 1, clientX: 320, clientY: 120 }),
      );
    });
    const whileDragging = dialog.style.transform;
    expect(whileDragging).not.toBe('translate(120px, 16px)');

    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: 4,
          clientY: 4,
        }),
      );
    });
    expect(document.body).not.toHaveClass('react-draggable-transparent-selection');

    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, buttons: 0, clientX: 480, clientY: 280 }),
      );
    });
    expect(dialog.style.transform).toBe(whileDragging);
  });

  it('stops moving a window when the pointer is cancelled', () => {
    renderAt('/');
    const dialog = screen.getByRole('dialog', { name: 'About' });
    const title = dialog.querySelector('.win95-title');
    if (!title) throw new Error('Missing title bar');

    act(() => {
      title.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: 200,
          clientY: 20,
        }),
      );
      title.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 200, clientY: 20 }),
      );
    });

    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointercancel', {
          bubbles: true,
          pointerId: 1,
          clientX: 260,
          clientY: 80,
        }),
      );
    });

    expect(document.body).not.toHaveClass('react-draggable-transparent-selection');
  });

  it('closes the window from the title bar and leaves its taskbar button gone', async () => {
    renderAt('/');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('heading', { name: /I'm Antonio Lu/ })).not.toBeInTheDocument();
    expect(taskbar().queryByRole('button', { name: 'About' })).not.toBeInTheDocument();
    expect(path()).toHaveTextContent(/^\/$/);
  });

  it('does not reopen About after the last window on the first visit is closed', async () => {
    renderAt('/');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
    expect(path()).toHaveTextContent(/^\/$/);
  });

  it('maximizes a window and restores it', async () => {
    renderAt('/');
    const dialog = screen.getByRole('dialog', { name: 'About' });

    await userEvent.click(screen.getByRole('button', { name: 'Maximize' }));
    expect(dialog).toHaveAttribute('data-maximized', 'true');
    expect(dialog).toHaveAttribute('data-fill', 'true');
    expect(dialog).toHaveClass('window-fill');

    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(dialog).toHaveAttribute('data-maximized', 'false');
    expect(dialog).toHaveAttribute('data-fill', 'false');
  });

  it('selects a desktop icon on click and opens it on double-click', async () => {
    renderAt('/');
    const projects = desktop().getByRole('button', { name: 'Projects' });

    await userEvent.click(projects);
    expect(projects).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('dialog', { name: 'Projects' })).not.toBeInTheDocument();

    await userEvent.dblClick(projects);
    expect(screen.getByRole('dialog', { name: 'Projects' })).toBeInTheDocument();
    expect(taskbar().getByRole('button', { name: 'About' })).toBeInTheDocument();
    expect(taskbar().getByRole('button', { name: 'Projects' })).toBeInTheDocument();
    expect(taskbar().queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
  });

  it('selects a desktop shortcut on click and opens it in a new tab on double-click', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderAt('/');
    const linkedIn = desktop().getByRole('button', { name: 'LinkedIn' });
    const mail = desktop().getByRole('button', { name: 'Mail' });

    await userEvent.click(linkedIn);

    expect(linkedIn).toHaveAttribute('aria-pressed', 'true');
    expect(linkedIn).toHaveAttribute('draggable', 'false');
    expect(mail).toHaveAttribute('draggable', 'false');
    expect(open).not.toHaveBeenCalled();
    expect(desktop().queryByRole('link', { name: 'LinkedIn' })).not.toBeInTheDocument();
    expect(desktop().queryByRole('link', { name: 'Mail' })).not.toBeInTheDocument();

    await userEvent.dblClick(linkedIn);
    expect(open).toHaveBeenCalledWith(
      profile.links.find((link) => link.label === 'LinkedIn')?.url,
      '_blank',
      'noopener,noreferrer',
    );

    await userEvent.dblClick(mail);
    expect(open).toHaveBeenCalledTimes(1);
    expect(taskbar().queryByRole('link', { name: 'LinkedIn' })).not.toBeInTheDocument();
    expect(taskbar().queryByRole('link', { name: 'Mail' })).not.toBeInTheDocument();
    expect(taskbar().queryByRole('link', { name: 'Resume' })).not.toBeInTheDocument();
    open.mockRestore();
  });

  it('minimizes to the taskbar and restores from that button', async () => {
    renderAt('/');

    await userEvent.click(screen.getByRole('button', { name: 'Minimize' }));

    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
    expect(taskbar().getByRole('button', { name: 'About', pressed: false })).toBeInTheDocument();

    await userEvent.click(taskbar().getByRole('button', { name: 'About' }));
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();
    expect(taskbar().getByRole('button', { name: 'About', pressed: true })).toBeInTheDocument();

    await userEvent.click(taskbar().getByRole('button', { name: 'About', pressed: true }));
    expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument();
    expect(taskbar().getByRole('button', { name: 'About', pressed: false })).toBeInTheDocument();
  });

  it('stacks a new window above the others and brings a clicked window to the front', async () => {
    renderAt('/');
    await userEvent.dblClick(desktop().getByRole('button', { name: 'Projects' }));

    const about = screen.getByRole('dialog', { name: 'About' });
    const projects = screen.getByRole('dialog', { name: 'Projects' });
    expect(Number(projects.style.zIndex)).toBeGreaterThan(Number(about.style.zIndex));
    expect(about.querySelector('.win95-title')).toHaveClass('is-inactive');
    expect(projects.querySelector('.win95-title')).not.toHaveClass('is-inactive');
    expect(path()).toHaveTextContent(/^\/$/);

    await userEvent.click(about);
    expect(Number(about.style.zIndex)).toBeGreaterThan(Number(projects.style.zIndex));
    expect(about.querySelector('.win95-title')).not.toHaveClass('is-inactive');
    expect(projects.querySelector('.win95-title')).toHaveClass('is-inactive');
    expect(path()).toHaveTextContent(/^\/$/);
    expect(taskbar().getByRole('button', { name: 'About', pressed: true })).toBeInTheDocument();
    expect(taskbar().getByRole('button', { name: 'Projects', pressed: false })).toBeInTheDocument();
  });

  it('opens and closes the Start menu, and launches an app from it', async () => {
    renderAt('/');
    const start = screen.getByRole('button', { name: 'Start', expanded: false });

    await userEvent.click(start);
    expect(start).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Projects' })).toBeInTheDocument();
    const linkedIn = profile.links.find((link) => link.label === 'LinkedIn');
    const mail = profile.links.find((link) => link.label === 'Mail');
    expect(screen.getByRole('menuitem', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      linkedIn?.url,
    );
    expect(screen.getByRole('menuitem', { name: 'Mail' })).toHaveAttribute('href', mail?.url);
    expect(screen.queryByRole('menuitem', { name: 'Resume PDF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Quick launch' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Projects' }));
    expect(screen.getByRole('dialog', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.queryByRole('menu', { name: 'Start' })).not.toBeInTheDocument();
    expect(start).toHaveAttribute('aria-expanded', 'false');
  });

  it('fills the screen on a phone and still opens apps from Start', async () => {
    setWidth(390);
    renderAt('/');

    expect(screen.getByRole('dialog', { name: 'About' })).toHaveAttribute('data-fill', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Experiences' }));

    expect(screen.getByRole('tab', { name: 'Trimble' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Experiences' })).toHaveAttribute(
      'data-fill',
      'true',
    );
  });
});
