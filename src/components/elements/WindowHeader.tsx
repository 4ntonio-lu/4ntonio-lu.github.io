import { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { img } from '../../assets/images/img';

function WindowHeader({ header }: { header: string }): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="windowbox-header flex items-center justify-between overflow-auto bg-[#000082] p-[5px] pl-[10px]">
      <p className="m-0 text-[1.1rem] font-extrabold text-[#DBDBDB]">{header}</p>
      <div>
        <button
          onClick={() => navigate('/')}
          className="button-shadow mx-[0.15rem] pr-[1px] text-[0.75rem] font-extrabold"
        >
          <img src={img.minimize} alt="Minimize" className="h-auto w-[0.85rem] p-[0.15rem]" />
        </button>
        <button className="button-shadow pointer-events-none mx-[0.15rem] cursor-not-allowed pr-[1px] text-[0.75rem] font-extrabold">
          <img src={img.maximize} alt="Maximize" className="h-auto w-[0.85rem] p-[0.15rem]" />
        </button>
        <button
          onClick={() => navigate('/')}
          className="button-shadow mx-[0.15rem] pr-[1px] text-[0.75rem] font-extrabold"
        >
          <img src={img.close} alt="Close" className="h-auto w-[0.85rem] p-[0.15rem]" />
        </button>
      </div>
    </div>
  );
}

export default WindowHeader;
