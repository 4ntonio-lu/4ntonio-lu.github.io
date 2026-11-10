import { TabList, TabPanel, Tabs, Tab } from 'react-tabs';
import { JSX } from 'react';
import 'react-tabs/style/react-tabs.css';
import WindowBox from '../elements/WindowBox';
import ProjectTab from '../elements/ProjectTab';
import { projects } from '../../content';

function Projects(): JSX.Element {
  return (
    <WindowBox
      name="Projects"
      width={0.5}
      content={
        <div className="m-1 p-1 sm:m-3">
          <Tabs>
            <TabList>
              {projects.map((project, index) => (
                <Tab key={index}>{project.name}</Tab>
              ))}
            </TabList>

            <div className="tab-panels">
              {projects.map((project, index) => (
                <TabPanel key={index}>
                  <ProjectTab project={project} />
                </TabPanel>
              ))}
            </div>
          </Tabs>
        </div>
      }
    />
  );
}

export default Projects;
