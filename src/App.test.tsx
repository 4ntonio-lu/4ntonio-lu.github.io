import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('opens the About window on the first visit', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: /I'm Antonio Lu/ })).toBeInTheDocument();
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

  it('embeds the resume PDF', () => {
    renderAt('/resume');

    expect(screen.getByTitle('Resume PDF')).toHaveAttribute(
      'src',
      expect.stringContaining('Resume.pdf'),
    );
  });

  it('closes the window from the title bar', async () => {
    renderAt('/about');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('heading', { name: /I'm Antonio Lu/ })).not.toBeInTheDocument();
  });

  it("disables the Maximize button, since windows can't be maximized yet", () => {
    renderAt('/about');

    expect(screen.getByRole('button', { name: 'Maximize' })).toBeDisabled();
  });

  it('names each desktop icon and taskbar button once', () => {
    renderAt('/about');

    // One link on the desktop and one on the taskbar, without the icon repeating the name.
    expect(screen.getAllByRole('link', { name: 'Experiences' })).toHaveLength(2);
  });

  it('opens and closes the mobile Start menu', async () => {
    renderAt('/about');
    const start = screen.getByRole('button', { name: 'Start', expanded: false });

    await userEvent.click(start);
    expect(start).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('link', { name: 'Projects' })).toHaveLength(3);

    await userEvent.click(start);
    expect(start).toHaveAttribute('aria-expanded', 'false');
  });
});
