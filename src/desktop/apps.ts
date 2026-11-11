import { img } from '../assets/images/img';

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
    path: '/about',
    icon: img.about,
  },
  {
    id: 'resume',
    title: 'Resume',
    windowName: 'Resume',
    path: '/resume',
    icon: img.resume,
  },
  {
    id: 'experiences',
    title: 'Experiences',
    windowName: 'Experiences',
    path: '/experiences',
    icon: img.experiences,
  },
  {
    id: 'projects',
    title: 'Projects',
    windowName: 'Projects',
    path: '/projects',
    icon: img.projects,
  },
  {
    id: 'crypto',
    title: 'Crypto',
    windowName: 'Cryptocurrencies',
    path: '/crypto',
    icon: img.crypto,
  },
] as const;

export type DesktopApp = (typeof apps)[number];
export type AppId = DesktopApp['id'];

export function appById(id: string | null | undefined): DesktopApp | undefined {
  return apps.find((app) => app.id === id);
}

export function appByPath(path: string): DesktopApp | undefined {
  return apps.find((app) => app.path === path);
}

export function appByWindowName(name: string): DesktopApp | undefined {
  return apps.find((app) => app.windowName === name);
}
