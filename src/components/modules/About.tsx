import { Fragment, JSX } from 'react';
import WindowBox from '../elements/WindowBox';
import { profile } from '../../content';

function About(): JSX.Element {
  const { heading, paragraphs } = profile.about;
  return (
    <WindowBox
      name="About"
      width={0.33}
      content={
        <div className="px-8 pb-4 pt-8 max-md:p-6">
          <h1>{heading}</h1>
          {paragraphs.map((paragraph, index) => (
            <Fragment key={index}>
              <br />
              <h3>{paragraph}</h3>
            </Fragment>
          ))}
        </div>
      }
    />
  );
}

export default About;
