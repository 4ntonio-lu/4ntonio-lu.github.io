import { img } from '../assets/images/img';
import { contentImage, profile } from '../content';

/**
 * Desktop apps, in Start-menu order.
 *
 * To add an app:
 * 1. Create a module that renders `<WindowBox name="..." />`. `name` must match `windowName`.
 * 2. Add an entry here.
 * 3. Register the component in `appComponents.tsx`. TypeScript requires every id below.
 */
export const apps = [
  {
    id: 'about',
    title: 'About',
    windowName: 'About',
    icon: img.about,
  },
  {
    id: 'resume',
    title: 'Resume',
    windowName: 'Resume',
    icon: img.resume,
  },
  {
    id: 'experiences',
    title: 'Experiences',
    windowName: 'Experiences',
    icon: img.experiences,
  },
  {
    id: 'projects',
    title: 'Projects',
    windowName: 'Projects',
    icon: img.projects,
  },
  {
    id: 'crypto',
    title: 'Crypto',
    windowName: 'Cryptocurrencies',
    icon: img.crypto,
  },
  {
    id: 'stocks',
    title: 'Stocks',
    windowName: 'Stocks',
    icon: img.stocks,
  },
  {
    id: 'weather',
    title: 'Weather',
    windowName: 'Weather',
    icon: img.weather,
  },
] as const;

export type DesktopApp = (typeof apps)[number];
export type AppId = DesktopApp['id'];

export function appById(id: string | null | undefined): DesktopApp | undefined {
  return apps.find((app) => app.id === id);
}

export function appByWindowName(name: string): DesktopApp | undefined {
  return apps.find((app) => app.windowName === name);
}

/** Shortcuts that open an address instead of a window. They come from profile.json. */
export type DesktopLink = {
  id: string;
  title: string;
  icon: string;
  url: string;
};

export const desktopLinks: readonly DesktopLink[] = profile.links.map((link) => ({
  id: link.label.toLowerCase().replace(/\s+/g, '-'),
  title: link.label,
  icon: contentImage(link.icon),
  url: link.url,
}));
