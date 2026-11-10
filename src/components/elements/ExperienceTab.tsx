import { JSX } from 'react';
import InformationBox from './InformationBox';

type ExperienceTabProps = {
  experience: {
    icon: string;
    role: string;
    company: string;
    location: string;
    date: string;
    skills: string;
    description: string[];
  };
};

function ExperienceTab({ experience }: ExperienceTabProps): JSX.Element {
  return (
    <>
      <div className="mb-4 flex justify-between gap-4 max-md:flex-col max-md:items-center">
        <div className="flex w-full flex-col items-center justify-center gap-4 md:w-[40%]">
          <img src={experience.icon} alt={experience.company} className="h-24" />
          <div className="mb-0 flex flex-col gap-2 text-center leading-4">
            <p style={{ fontWeight: '800' }}>{experience.role}</p>
            <p>{experience.company}</p>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center gap-2 md:w-[60%]">
          <div className="flex gap-3">
            <InformationBox title="Location" classes="w-[40%]" content={experience.location} />
            <InformationBox title="Date" classes="w-[60%]" content={experience.date} />
          </div>
          <InformationBox title="Skills" classes="" content={experience.skills} />
        </div>
      </div>

      <fieldset>
        <legend className="ml-2 px-1 text-[#272727]">Description</legend>
        <div className="p-4">
          <ul className="flex flex-col gap-4 pl-4">
            {experience.description.map((desc, index) => (
              <li key={index} className="leading-6">
                {desc}
              </li>
            ))}
          </ul>
        </div>
      </fieldset>
    </>
  );
}

export default ExperienceTab;
