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
});
