import { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { img } from '../../assets/images/img';

function WindowHeader({ header }: { header: string }): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className='windowbox-header bg-[#000082] flex justify-between items-center p-[5px] pl-[10px] overflow-auto'>
      <p className='text-[#DBDBDB] text-[1.1rem] font-extrabold m-0'>{header}</p>
      <div>
        <button onClick={() => navigate('/')} className='button-shadow text-[0.75rem] font-extrabold pr-[1px] mx-[0.15rem]'>
          <img src={img.minimize} alt="Minimize" className='w-[0.85rem] p-[0.15rem] h-auto'/>
        </button>
        <button className='button-shadow text-[0.75rem] font-extrabold pr-[1px] mx-[0.15rem]'>
          <img src={img.maximize} alt="Maximize" className='w-[0.85rem] p-[0.15rem] h-auto'/>
        </button>
        <button onClick={() => navigate('/')} className='button-shadow text-[0.75rem] font-extrabold pr-[1px] mx-[0.15rem]'>
          <img src={img.close} alt="Close" className='w-[0.85rem] p-[0.15rem] h-auto'/>
        </button>
      </div>
    </div>
  );
}

export default WindowHeader;