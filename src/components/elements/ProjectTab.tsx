import { JSX } from 'react';
import InformationBox from './InformationBox';

type Project = {
  name: string;
  src: string;
  date: string;
  skills: string;
  link?: string;
  description: string[];
};

function ProjectTab({ project }: { project: Project }): JSX.Element {
  return (
    <>
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex w-full flex-col items-center justify-evenly gap-2 sm:w-[40%] sm:gap-4">
          <img src={project.src} alt={project.name} className="h-24" />
          <p className="text-center text-[1.15rem] font-extrabold md:text-[20px]">{project.name}</p>
        </div>

        <div className="flex w-full flex-col-reverse items-center gap-4 sm:w-[60%] sm:flex-col">
          <InformationBox title="Date" content={project.date} classes="w-full" />
          <InformationBox title="Skills" content={project.skills} classes="w-full" />

          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              className="button-shadow w-1/2 p-2 text-center no-underline sm:text-[18px]"
            >
              {project.name}
            </a>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="ml-2 px-1 text-[#272727]">Description</legend>
        <div className="p-4">
          <ul className="flex flex-col gap-4 pl-4">
            {project.description.map((desc, index) => (
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

export default ProjectTab;
