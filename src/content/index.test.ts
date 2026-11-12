import { describe, expect, it } from 'vitest';
import {
  byMostRecent,
  contentImage,
  experiences,
  formatDateRange,
  formatMonth,
  profile,
  projects,
  resumeUrl,
} from '.';

describe('content', () => {
  it('formats months and date ranges', () => {
    expect(formatMonth('2024-09')).toBe('Sep 2024');
    expect(formatMonth('2022-01')).toBe('Jan 2022');
    expect(formatDateRange({ start: '2022-03', end: '2023-11' })).toBe('Mar 2022 - Nov 2023');
    expect(formatDateRange({ start: '2025-06', end: null })).toBe('Jun 2025 - Present');
  });

  it('sorts ongoing entries first, then newest first', () => {
    const entries = [
      { start: '2020-01', end: '2021-01' },
      { start: '2023-01', end: null },
      { start: '2022-01', end: '2024-01' },
      { start: '2023-06', end: '2024-01' },
    ];
    expect([...entries].sort(byMostRecent)).toEqual([
      { start: '2023-01', end: null },
      { start: '2023-06', end: '2024-01' },
      { start: '2022-01', end: '2024-01' },
      { start: '2020-01', end: '2021-01' },
    ]);
  });

  it('shows experiences and projects newest first', () => {
    expect(experiences.map((job) => job.company)).toEqual([
      'Charles Schwab',
      'Trimble',
      'Microchip',
    ]);
    expect(projects.map((project) => project.name)).toEqual([
      'Portfolio',
      'Ticket Tracker',
      'Mind Kingdom',
    ]);
  });

  it('resolves every image the content names', () => {
    const files = [
      ...experiences.map((job) => job.logo),
      ...projects.map((project) => project.image),
      ...profile.links.map((link) => link.icon),
    ];
    for (const file of files) expect(contentImage(file), file).toBeTruthy();
  });

  it('links to the resume in public/', () => {
    expect(resumeUrl).toBe('/Antonio%20Lu%20Resume.pdf');
  });
});
