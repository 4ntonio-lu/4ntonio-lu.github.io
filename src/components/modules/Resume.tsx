import { JSX } from 'react';
import WindowBox from '../elements/WindowBox';
import { resumeUrl } from '../../content';

function Resume(): JSX.Element {
  return (
    <WindowBox
      name="Resume"
      width={0.84}
      fillHeight
      content={
        <iframe
          src={`${resumeUrl}#navpanes=0&view=Fit`}
          className="resume-page"
          onMouseDown={(e) => e.stopPropagation()}
          title="Resume PDF"
        />
      }
    />
  );
}

export default Resume;
