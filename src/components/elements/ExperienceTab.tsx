import { JSX } from 'react';
import InformationBox from './InformationBox';
import { contentImage, formatDateRange, type Experience } from '../../content';

function ExperienceTab({ experience }: { experience: Experience }): JSX.Element {
  return (
    <>
      <div className="mb-4 flex justify-between gap-4 max-md:flex-col max-md:items-center">
        <div className="flex w-full flex-col items-center justify-center gap-4 md:w-[40%]">
          <img src={contentImage(experience.logo)} alt={experience.company} className="h-24" />
          <div className="mb-0 flex flex-col gap-2 text-center leading-4">
            <p style={{ fontWeight: '800' }}>{experience.role}</p>
            <p>{experience.company}</p>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center gap-2 md:w-[60%]">
          <div className="flex gap-3">
            <InformationBox title="Location" classes="w-[40%]" content={experience.location} />
            <InformationBox title="Date" classes="w-[60%]" content={formatDateRange(experience)} />
          </div>
          <InformationBox title="Skills" classes="" content={experience.skills.join(', ')} />
        </div>
      </div>

      <fieldset>
        <legend className="ml-2 px-1 text-[#272727]">Description</legend>
        <div className="p-4">
          <ul className="flex flex-col gap-4 pl-4">
            {experience.bullets.map((bullet, index) => (
              <li key={index} className="leading-6">
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </fieldset>
    </>
  );
}

export default ExperienceTab;
