import { Link } from 'react-router-dom';
import { JSX } from 'react';

type NavIconLinkProps = {
  icon: string;
  to: string;
  alt: string;
}

function NavIconLink({ icon, to, alt }: NavIconLinkProps): JSX.Element {
  return (
    <Link to={to} target="_blank" className="w-full flex justify-center">
      <img src={icon} alt={alt} className="w-[1.65rem]" />
    </Link>
  );
}

export default NavIconLink;