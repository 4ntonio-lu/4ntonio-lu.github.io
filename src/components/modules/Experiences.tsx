import { TabList, TabPanel, Tabs, Tab } from 'react-tabs';
import { JSX } from 'react';
import 'react-tabs/style/react-tabs.css';
import WindowBox from '../elements/WindowBox';
import ExperienceTab from '../elements/ExperienceTab';
import { experiences } from '../../content';

function Experiences(): JSX.Element {
  return (
    <WindowBox
      name="Experiences"
      width={0.5}
      content={
        <div className="m-1 p-1 sm:m-3">
          <Tabs>
            <TabList>
              {experiences.map((experience, index) => (
                <Tab key={index}>{experience.company}</Tab>
              ))}
            </TabList>

            <div className="tab-panels">
              {experiences.map((experience, index) => (
                <TabPanel key={index}>
                  <ExperienceTab experience={experience} />
                </TabPanel>
              ))}
            </div>
          </Tabs>
        </div>
      }
    />
  );
}

export default Experiences;
