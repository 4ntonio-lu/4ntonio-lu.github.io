import { useState, useEffect, JSX } from 'react';
import { Navbar } from "react-bootstrap";
import NavTabItem from "./NavTabItem";
import NavIconLink from "./NavIconLink";
import { img } from '../../assets/images/img';
import resumePDF from "../../assets/documents/Antonio Lu Resume.pdf";

type Route = {
    name: string;
    path: string;
    icon: string;
}

function useDateTime() {
  const [dateTime, setDateTime] = useState({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: new Date().toLocaleDateString()
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: new Date().toLocaleDateString()
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
            <Navbar className='bg-[#C3C3C3] [box-shadow:inset_0.15rem_0.15rem_0_#DBDBDB] hidden fixed items-center bottom-0 w-full p-[5px] md:flex z-[9999]'>
                <button className='button-shadow flex items-center gap-2 border-none bg-none cursor-pointer text-[1.1rem] font-extrabold w-[99.3%] p-[7px] text-center leading-4 md:w-[75px] max-md:box-border max-md:mt-[0.25rem]'>
                    <img src={img.start} alt="Start" className='w-6 h-6 object-contain' />
                    <h4>Start</h4>
                </button>

                <div className="flex items-center gap-2 px-3 mx-2 border-l-[0.15rem] border-l-[#828282] border-r-[0.15rem] border-r-[#D8D8D8] [box-shadow:inset_0.15rem_0_0_#D8D8D8,inset_-0.15rem_0_0_#828282]">
                    <NavIconLink alt="LinkedIn" icon={img.linkedin} to="https://www.linkedin.com/in/lu-antonio/"/>
                    <NavIconLink alt="Mail" icon={img.mail} to="mailto:antoniolu.swe@gmail.com"/>
                    <NavIconLink alt="Resume" icon={img.resume} to={resumePDF}/>
                </div>

                <div className="flex items-center w-full">
                    {routes.map((route) => <NavTabItem key={route.path} name={route.name} to={route.path} icon={route.icon} />)}
                </div>

                  <div className="ml-auto font-mono pr-6 text-right text-sm whitespace-nowrap">
                    <div>{useDateTime().time}</div>
                    <div>{useDateTime().date}</div>
                </div>
            </Navbar>

            <Navbar className="bg-[#C3C3C3] [box-shadow:inset_0.15rem_0.15rem_0_#DBDBDB] fixed items-center bottom-0 w-full p-[5px] md:hidden z-[9999]">
                {
                    isExpanded &&
                    <div className="max-md:flex max-md:flex-col max-md:gap-[0.25rem]">
                        {routes.map((route) =>
                            <NavTabItem key={route.path} name={route.name} to={route.path} icon={route.icon} callback={() => setIsExpanded(false)} />
                        )}
                    </div>
                }

                <button onClick={() => setIsExpanded(!isExpanded)} className={`button-shadow flex items-center justify-center gap-2 border-none bg-none cursor-pointer text-[1.1rem] font-extrabold w-[98%] p-[7px] text-center leading-4 md:w-[75px] max-md:box-border max-md:mt-[0.25rem] ${isExpanded ? 'max-md:border-[#272727] max-md:border-t-[#F7F7F7] max-md:border-r-[#F7F7F7] max-md:border-b-[#272727] max-md:border-l-[#F7F7F7] max-md:shadow-inner max-md:shadow-[#828282]' : ''}`}>
                    <img alt="Start" src={img.start} className="w-6 h-6 object-contain"/>
                    <h4 className="m-0 p-0 leading-none">Start</h4>
                </button>
            </Navbar>
        </>
    );
}

export default NavBar;