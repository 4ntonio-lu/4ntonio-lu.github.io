import { JSX } from 'react';
import { img } from '../../assets/images/img';

const captionButton = 'caption-button button-shadow';

function RestoreGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 12 11" aria-hidden="true">
      <rect x="3" y="0" width="9" height="7" fill="none" stroke="#000" />
      <rect x="0" y="3" width="9" height="8" fill="#c0c0c0" stroke="#000" />
    </svg>
  );
}

type WindowHeaderProps = {
  title: string;
  titleId: string;
  icon?: string;
  active: boolean;
  maximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
};

function WindowHeader({
  title,
  titleId,
  icon,
  active,
  maximized,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowHeaderProps): JSX.Element {
  return (
    <div
      className={active ? 'win95-title' : 'win95-title is-inactive'}
      onDoubleClick={onToggleMaximize}
    >
      <div className="win95-title-label">
        {icon && <img src={icon} alt="" draggable={false} />}
        <p id={titleId} className="win95-title-text">
          {title}
        </p>
      </div>
      <div className="caption-buttons" onDoubleClick={(event) => event.stopPropagation()}>
        <button type="button" className={captionButton} onClick={onMinimize}>
          <img src={img.minimize} alt="Minimize" />
        </button>
        <button
          type="button"
          className={captionButton}
          aria-label={maximized ? 'Restore' : 'Maximize'}
          onClick={onToggleMaximize}
        >
          {maximized ? <RestoreGlyph /> : <img src={img.maximize} alt="" />}
        </button>
        <button type="button" className={`${captionButton} close`} onClick={onClose}>
          <img src={img.close} alt="Close" />
        </button>
      </div>
    </div>
  );
}

export default WindowHeader;
