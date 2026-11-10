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
    <NavLink
      to={to}
      className="group flex flex-col items-center gap-4 text-center font-[W95FA] text-[1.1rem] no-underline focus-visible:outline-none max-sm:text-[1rem]"
    >
      <img src={icon} alt="" className="h-12 w-auto" />
      {/* Win95 draws icon labels on the desktop color, which keeps them readable on any wallpaper. */}
      <mark
        className={`bg-[#008080] px-[2px] text-white group-focus-visible:[outline:1px_dotted_#fff] ${isActive ? '!bg-[#000082]' : ''}`}
      >
        {name}
      </mark>
    </NavLink>
  );
}

export default DesktopIcon;
