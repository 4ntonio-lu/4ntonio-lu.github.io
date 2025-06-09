import { NavLink } from 'react-router-dom';
import { JSX } from 'react';

type NavTabItemProps = {
  name: string;
  to: string;
  icon: string;
  callback?: () => void;
}

function NavTabItem({ name, to, icon, callback }: NavTabItemProps): JSX.Element {
  return (
    <NavLink to={to} onClick={callback} className={({ isActive }) => `text-[1.15rem] w-[99.3%] px-[15px] py-[5px] mr-[5px] no-underline flex items-center gap-4 md:w-[20%] md:px-[10px] md:py-[7px] md:gap-2 lg:w-[15%] max-md:border-none max-md:shadow-none max-md:box-border max-md:m-0 ${isActive ? 'bg-[#000082] bg-repeat border [border-color:#272727_#F7F7F7_#F7F7F7_#272727] [box-shadow:inset_0.1rem_0.1rem_0_#828282] md:bg-[#C3C3C3] md:font-extrabold md:bg-[url("/images/selected.png")] max-md:text-[#F7F7F7]' : 'button-shadow'}`}>
      <img src={icon} alt={name} className="h-8 md:h-[1.15rem]" />
      {name}
    </NavLink>
  );
}

export default NavTabItem;