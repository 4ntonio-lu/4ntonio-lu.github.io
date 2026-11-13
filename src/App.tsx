import { JSX } from 'react';
import { appComponents } from './desktop/appComponents';
import { apps } from './desktop/apps';
import DesktopIcons from './desktop/DesktopIcons';
import { DesktopProvider } from './desktop/DesktopProvider';
import { useDesktop } from './desktop/useDesktop';
import Taskbar from './desktop/Taskbar';
import { WeatherChromeSync } from './weather/selection';

function Desktop(): JSX.Element {
  const { windows, dispatch } = useDesktop();
  const openIds = new Set(windows.map((window) => window.id));

  return (
    <>
      <WeatherChromeSync />
      <div
        className="desktop"
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('.desktop-icon, .win95-window')) return;
          dispatch({ type: 'select', id: null });
        }}
      >
        <DesktopIcons />
        {apps.map((app) => {
          if (!openIds.has(app.id)) return null;
          const Component = appComponents[app.id];
          return <Component key={app.id} />;
        })}
      </div>
      <Taskbar />
    </>
  );
}

function App(): JSX.Element {
  return (
    <DesktopProvider>
      <Desktop />
    </DesktopProvider>
  );
}

export default App;
