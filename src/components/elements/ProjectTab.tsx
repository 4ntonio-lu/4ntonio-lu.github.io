import { JSX } from 'react';
import InformationBox from './InformationBox';
import { contentImage, formatDateRange, type Project } from '../../content';

function ProjectTab({ project }: { project: Project }): JSX.Element {
  return (
    <>
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex w-full flex-col items-center justify-evenly gap-2 sm:w-[40%] sm:gap-4">
          <img src={contentImage(project.image)} alt={project.name} className="h-24" />
          <p className="text-center text-[1.15rem] font-extrabold md:text-[20px]">{project.name}</p>
        </div>

        <div className="flex w-full flex-col-reverse items-center gap-4 sm:w-[60%] sm:flex-col">
          <InformationBox title="Date" content={formatDateRange(project)} classes="w-full" />
          <InformationBox title="Skills" content={project.skills.join(', ')} classes="w-full" />

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
            {project.bullets.map((bullet, index) => (
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

export default ProjectTab;
