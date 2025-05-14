import { JSX } from "react";
import InformationBox from "./InformationBox";

type Project = {
  name: string;
  src: string;
  date: string;
  skills: string;
  link?: string;
  description: string[];
}

function ProjectTab({ project }: { project: Project }): JSX.Element {
  return (
    <>
      <div className="flex flex-col items-center gap-4 mb-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col justify-evenly items-center gap-2 w-full sm:w-[40%] sm:gap-4">
          <img src={project.src} alt={project.name} className="h-24"/>
          <p className="font-extrabold text-center text-[1.15rem] md:text-[20px]">{project.name}</p>
        </div>

        <div className="flex flex-col-reverse items-center gap-4 w-full sm:w-[60%] sm:flex-col">
          <InformationBox title="Date" content={project.date} classes="w-full" />
          <InformationBox title="Skills" content={project.skills} classes="w-full" />

          {project.link && (
            <a href={project.link} target="_blank" rel="noreferrer" className="button-shadow text-center no-underline p-2 w-1/2 sm:text-[18px]">
              {project.name}
            </a>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="text-[#272727] ml-2 px-1">Description</legend>
        <div className="p-4">
          <ul className="flex flex-col pl-4 gap-4">
            {project.description.map((desc, index) => (
              <li key={index} className="leading-6">{desc}</li>
            ))}
          </ul>
        </div>
      </fieldset>
    </>
  );
}

export default ProjectTab;