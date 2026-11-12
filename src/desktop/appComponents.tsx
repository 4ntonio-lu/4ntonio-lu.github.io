import type { ComponentType } from 'react';
import About from '../components/modules/About';
import Crypto from '../components/modules/Crypto';
import Experiences from '../components/modules/Experiences';
import Projects from '../components/modules/Projects';
import Resume from '../components/modules/Resume';
import Stocks from '../components/modules/Stocks';
import Weather from '../components/modules/Weather';
import type { AppId } from './apps';

/** One component per app id. Adding an id in `apps.ts` without an entry here fails typecheck. */
export const appComponents: Record<AppId, ComponentType> = {
  about: About,
  resume: Resume,
  experiences: Experiences,
  projects: Projects,
  crypto: Crypto,
  stocks: Stocks,
  weather: Weather,
};
