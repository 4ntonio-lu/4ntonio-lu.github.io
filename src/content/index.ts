import type { Experience, Profile, Project } from './schema';
import experiencesFile from './experiences.json';
import projectsFile from './projects.json';
import profileFile from './profile.json';

export type { Experience, Link, Profile, Project } from './schema';

type Dated = { start: string; end: string | null };

// The JSON files are checked against ./schema.ts at build time (scripts/content/vite-plugin.ts),
// so the client trusts them instead of shipping zod to the browser.
function validated<T>(data: unknown): T {
  return data as T;
}

const images = import.meta.glob<string>('../assets/images/*.{png,jpg,jpeg,gif,svg,webp}', {
  eager: true,
  import: 'default',
});

export function contentImage(file: string): string {
  return images[`../assets/images/${file}`];
}

const monthFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return monthFormat.format(Date.UTC(year, month - 1));
}

// A plain hyphen because the W95FA font has no en dash, and the fallback glyph is taller.
export function formatDateRange({ start, end }: Dated): string {
  return `${formatMonth(start)} - ${end === null ? 'Present' : formatMonth(end)}`;
}

/** Newest first: ongoing entries, then by end month, then by start month. */
export function byMostRecent(a: Dated, b: Dated): number {
  const endA = a.end ?? '9999-12';
  const endB = b.end ?? '9999-12';
  return endB.localeCompare(endA) || b.start.localeCompare(a.start);
}

export const experiences = [
  ...validated<{ experiences: Experience[] }>(experiencesFile).experiences,
].sort(byMostRecent);

export const projects = [...validated<{ projects: Project[] }>(projectsFile).projects].sort(
  byMostRecent,
);

export const profile = validated<Profile>(profileFile);

export const resumeUrl = `${import.meta.env.BASE_URL}${encodeURIComponent(profile.resumeFile)}`;
