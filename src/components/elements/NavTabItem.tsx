import { NavLink } from 'react-router-dom';
import { JSX } from 'react';

type NavTabItemProps = {
  name: string;
  to: string;
  icon: string;
  callback?: () => void;
};

function NavTabItem({ name, to, icon, callback }: NavTabItemProps): JSX.Element {
  return (
    <NavLink
      to={to}
      onClick={callback}
      className={({ isActive }) =>
        `mr-[5px] flex w-[99.3%] min-w-0 items-center gap-4 px-[15px] py-[5px] text-[1.15rem] no-underline max-md:m-0 max-md:box-border max-md:border-none max-md:shadow-none md:w-[20%] md:gap-2 md:px-[10px] md:py-[7px] lg:w-[15%] ${isActive ? 'border bg-[#000082] bg-repeat [border-color:#272727_#F7F7F7_#F7F7F7_#272727] [box-shadow:inset_0.1rem_0.1rem_0_#828282] max-md:text-[#F7F7F7] md:bg-[#C3C3C3] md:font-extrabold' : 'button-shadow'}`
      }
    >
      <img src={icon} alt="" className="h-8 shrink-0 md:h-[1.15rem]" />
      <span className="truncate">{name}</span>
    </NavLink>
  );
}

export default NavTabItem;
