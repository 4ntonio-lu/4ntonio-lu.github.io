import { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { img } from '../../assets/images/img';

const captionButton = 'button-shadow pr-[1px] text-[0.75rem] font-extrabold';
const captionGlyph = 'h-auto w-[0.85rem] p-[0.15rem]';

function WindowHeader({ header }: { header: string }): JSX.Element {
  const navigate = useNavigate();
  // Each app's icon shares its window's name, for example about.png for "About".
  const icon = img[header.toLowerCase()];

  return (
    <div className="windowbox-header flex shrink-0 items-center justify-between overflow-auto bg-[#000082] p-[5px] pl-[6px]">
      <div className="flex min-w-0 items-center gap-[6px]">
        {icon && <img src={icon} alt="" className="h-[1.1rem] w-[1.1rem] shrink-0" />}
        <p className="m-0 truncate text-[1.1rem] font-extrabold text-white">{header}</p>
      </div>
      <div className="flex shrink-0 items-center">
        <button onClick={() => navigate('/')} className={captionButton}>
          <img src={img.minimize} alt="Minimize" className={captionGlyph} />
        </button>
        <button disabled className={captionButton}>
          <img
            src={img.maximize}
            alt="Maximize"
            className={`${captionGlyph} [filter:invert(50%)_drop-shadow(1px_1px_0_#fff)]`}
          />
        </button>
        <button onClick={() => navigate('/')} className={`${captionButton} ml-[0.2rem]`}>
          <img src={img.close} alt="Close" className={captionGlyph} />
        </button>
      </div>
    </div>
  );
}

export default WindowHeader;
