import { Navbar } from 'react-bootstrap';
import { JSX } from 'react';
import DesktopIcon from './DesktopIcon';

type Route = {
  name: string;
  path: string;
  icon: string;
};

function DesktopPanel({ routes }: { routes: Route[] }): JSX.Element {
  return (
    <Navbar className="absolute top-0 ml-8 mt-8 flex flex-col gap-[2.25rem] max-md:hidden">
      {routes.map((route, index) => (
        <DesktopIcon key={index} name={route.name} to={route.path} icon={route.icon} />
      ))}
    </Navbar>
  );
}

export default DesktopPanel;
