import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

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

  it('opens the About window on the first visit and puts it in the address bar', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: /I'm Antonio Lu/ })).toBeInTheDocument();
    expect(taskbar().getByRole('button', { name: 'About', pressed: true })).toBeInTheDocument();
    expect(path()).toHaveTextContent(/^\/about$/);
  });

  it('shows a tab for each experience and switches between them', async () => {
    renderAt('/experiences');

    expect(screen.getByRole('tab', { name: 'Trimble', selected: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Microchip' }));

    expect(screen.getByRole('tab', { name: 'Microchip', selected: true })).toBeInTheDocument();
    expect(screen.getByText('Full Stack Software Engineer Intern')).toBeVisible();
  });

  it('shows a tab for each project', () => {
    renderAt('/projects');

    for (const name of ['Portfolio', 'Ticket Tracker', 'Mind Kingdom']) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
  });

  it('embeds the resume PDF in a wide window', () => {
    renderAt('/resume');

    expect(screen.getByTitle('Resume PDF')).toHaveAttribute(
      'src',
      expect.stringContaining('Resume.pdf'),
    );
    expect(screen.getByRole('dialog', { name: 'Resume' })).toHaveStyle({ width: '84%' });
  });

  it('closes the window from the title bar and leaves its taskbar button gone', async () => {
    renderAt('/about');

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
    renderAt('/about');
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
    renderAt('/about');
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

  it('minimizes to the taskbar and restores from that button', async () => {
    renderAt('/about');

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
    renderAt('/about');
    await userEvent.dblClick(desktop().getByRole('button', { name: 'Projects' }));

    const about = screen.getByRole('dialog', { name: 'About' });
    const projects = screen.getByRole('dialog', { name: 'Projects' });
    expect(Number(projects.style.zIndex)).toBeGreaterThan(Number(about.style.zIndex));
    expect(about.querySelector('.win95-title')).toHaveClass('is-inactive');
    expect(projects.querySelector('.win95-title')).not.toHaveClass('is-inactive');
    expect(path()).toHaveTextContent(/^\/projects$/);

    await userEvent.click(about);
    expect(Number(about.style.zIndex)).toBeGreaterThan(Number(projects.style.zIndex));
    expect(about.querySelector('.win95-title')).not.toHaveClass('is-inactive');
    expect(projects.querySelector('.win95-title')).toHaveClass('is-inactive');
    expect(path()).toHaveTextContent(/^\/about$/);
    expect(taskbar().getByRole('button', { name: 'About', pressed: true })).toBeInTheDocument();
    expect(taskbar().getByRole('button', { name: 'Projects', pressed: false })).toBeInTheDocument();
  });

  it('opens and closes the Start menu, and launches an app from it', async () => {
    renderAt('/about');
    const start = screen.getByRole('button', { name: 'Start', expanded: false });

    await userEvent.click(start);
    expect(start).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      expect.stringContaining('linkedin.com'),
    );
    expect(screen.getByRole('menuitem', { name: 'Mail' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:'),
    );
    expect(screen.getByRole('menuitem', { name: 'Resume PDF' })).toHaveAttribute(
      'href',
      expect.stringContaining('Resume.pdf'),
    );

    await userEvent.click(screen.getByRole('menuitem', { name: 'Projects' }));
    expect(screen.getByRole('dialog', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.queryByRole('menu', { name: 'Start' })).not.toBeInTheDocument();
    expect(start).toHaveAttribute('aria-expanded', 'false');
  });

  it('fills the screen on a phone and still opens apps from Start', async () => {
    setWidth(390);
    renderAt('/about');

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
