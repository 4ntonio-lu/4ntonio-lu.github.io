import { NavLink, useLocation } from 'react-router-dom';
import { JSX } from 'react';

type DesktopIconProps = {
  name: string;
  icon: string;
  to: string;
};

function DesktopIcon({ name, icon, to }: DesktopIconProps): JSX.Element {
  const isActive = useLocation().pathname === to;
  return (
    <NavLink to={to} className="font-[W95FA] text-[1.1rem] no-underline text-center flex flex-col items-center gap-4 max-sm:text-[1rem]">
      <img src={icon} alt={name} className="h-12 w-auto"/>
      <mark className={`bg-transparent text-[#DBDBDB] ${isActive ? '!bg-[#000082]' : ''}`}>{name}</mark>
    </NavLink>
  );
}

export default DesktopIcon;