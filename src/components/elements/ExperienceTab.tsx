import { JSX } from "react";
import InformationBox from "./InformationBox";

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
      <div className="flex justify-between gap-4 mb-4 max-md:flex-col max-md:items-center">
        <div className="flex flex-col justify-center items-center gap-4 w-full md:w-[40%]">
          <img src={experience.icon} alt={experience.company} className="h-24" />
          <div className="text-center flex flex-col gap-2 leading-4 mb-0">
            <p style={{ fontWeight: "800" }}>{experience.role}</p>
            <p>{experience.company}</p>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2 w-full md:w-[60%]">
          <div className="flex gap-3">
            <InformationBox title="Location" classes="w-[40%]" content={experience.location} />
            <InformationBox title="Date" classes="w-[60%]" content={experience.date} />
          </div>
          <InformationBox title="Skills" classes="" content={experience.skills} />
        </div>
      </div>

      <fieldset>
        <legend className="text-[#272727] ml-2 px-1">Description</legend>
        <div className="p-4">
          <ul className="flex flex-col pl-4 gap-4">
            {experience.description.map((desc, index) =>
              <li key={index} className="leading-6">{desc}</li>
            )}
          </ul>
        </div>
      </fieldset>
    </>
  );
}

export default ExperienceTab;