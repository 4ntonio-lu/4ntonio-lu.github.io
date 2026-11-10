import { useState, useEffect, JSX } from 'react';
import { Navbar } from 'react-bootstrap';
import NavTabItem from './NavTabItem';
import NavIconLink from './NavIconLink';
import { img } from '../../assets/images/img';
import { contentImage, profile, resumeUrl } from '../../content';

type Route = {
  name: string;
  path: string;
  icon: string;
};

function useDateTime() {
  const [dateTime, setDateTime] = useState({
    time: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    date: new Date().toLocaleDateString(),
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime({
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        date: new Date().toLocaleDateString(),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return dateTime;
}

function NavBar({ routes }: { routes: Route[] }): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <>
      <Navbar className="fixed bottom-0 z-[9999] box-border hidden w-full items-center bg-[#C3C3C3] p-[5px] [box-shadow:inset_0.15rem_0.15rem_0_#DBDBDB] md:flex">
        <button className="button-shadow flex w-[99.3%] cursor-pointer items-center gap-2 border-none bg-none p-[7px] text-center text-[1.1rem] font-extrabold leading-4 max-md:mt-[0.25rem] max-md:box-border md:w-[75px]">
          <img src={img.start} alt="Start" className="h-6 w-6 object-contain" />
          <h4>Start</h4>
        </button>

        <div className="mx-2 flex items-center gap-2 border-l-[0.15rem] border-r-[0.15rem] border-l-[#828282] border-r-[#D8D8D8] px-3 [box-shadow:inset_0.15rem_0_0_#D8D8D8,inset_-0.15rem_0_0_#828282]">
          {profile.links.map((link) => (
            <NavIconLink
              key={link.url}
              alt={link.label}
              icon={contentImage(link.icon)}
              to={link.url}
            />
          ))}
          <NavIconLink alt="Resume" icon={img.resume} to={resumeUrl} />
        </div>

        <div className="flex w-full min-w-0 items-center">
          {routes.map((route) => (
            <NavTabItem key={route.path} name={route.name} to={route.path} icon={route.icon} />
          ))}
        </div>

        <div className="ml-auto shrink-0 whitespace-nowrap pr-6 text-right font-mono text-sm">
          <div>{useDateTime().time}</div>
          <div>{useDateTime().date}</div>
        </div>
      </Navbar>

      <Navbar className="fixed bottom-0 z-[9999] box-border w-full items-center bg-[#C3C3C3] p-[5px] [box-shadow:inset_0.15rem_0.15rem_0_#DBDBDB] md:hidden">
        {isExpanded && (
          <div className="max-md:flex max-md:flex-col max-md:gap-[0.25rem]">
            {routes.map((route) => (
              <NavTabItem
                key={route.path}
                name={route.name}
                to={route.path}
                icon={route.icon}
                callback={() => setIsExpanded(false)}
              />
            ))}
          </div>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`button-shadow flex w-full cursor-pointer items-center justify-center gap-2 border-none bg-none p-[7px] text-center text-[1.1rem] font-extrabold leading-4 max-md:mt-[0.25rem] max-md:box-border md:w-[75px] ${isExpanded ? 'max-md:border-[#272727] max-md:border-b-[#272727] max-md:border-l-[#F7F7F7] max-md:border-r-[#F7F7F7] max-md:border-t-[#F7F7F7] max-md:shadow-inner max-md:shadow-[#828282]' : ''}`}
        >
          <img alt="Start" src={img.start} className="h-6 w-6 object-contain" />
          <h4 className="m-0 p-0 leading-none">Start</h4>
        </button>
      </Navbar>
    </>
  );
}

export default NavBar;
