import { JSX } from 'react';

type NavIconLinkProps = {
  icon: string;
  to: string;
  alt: string;
};

function NavIconLink({ icon, to, alt }: NavIconLinkProps): JSX.Element {
  return (
    <a href={to} target="_blank" className="flex w-full justify-center">
      <img src={icon} alt={alt} className="w-[1.65rem]" />
    </a>
  );
}

export default NavIconLink;
