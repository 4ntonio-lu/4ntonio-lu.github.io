import { TabList, TabPanel, Tabs, Tab } from "react-tabs";
import { JSX } from "react";
import 'react-tabs/style/react-tabs.css';
import WindowBox from "../elements/WindowBox";
import ExperienceTab from "../elements/ExperienceTab";
import { img } from "../../assets/images/img"

interface Experience {
    role: string;
    company: string;
    icon: string;
    location: string;
    date: string;
    skills: string;
    description: string[];
}

const experiences: Experience[] = [
    {
        role: "AI/ML Software Engineer Intern",
        company: "Trimble",
        icon: img.trimble,
        location: "Portland, OR",
        date: "May 2024 - Sep 2024",
        skills: "Python, Flask, JavaScript, ReactJS, NodeJS, SQL Server, GPT-4 API, HTML/CSS",
        description: [
            "Designed and implemented a full-stack AI application, utilizing OpenAI's GPT-4 API, Python, SQL Server, and SQLAlchemy ORM to transform natural language queries into structured database queries. Enabled dynamic report generation and data insights without requiring SQL expertise from users",
            "Built a responsive web application with ReactJS, NodeJS, and Flask to serve as a conversational interface for the AI system. Users could input free form questions, receive instant data responses, and export results, reducing reliance on technical teams for ad hoc reporting",
        ]
    },
    {
        role: "Full Stack Software Engineer Intern",
        company: "Microchip",
        icon: img.microchip,
        location: "Gresham, OR",
        date: "Mar 2022 – Nov 2023",
        skills: "C#, JavaScript, SQL Server, MySQL, ASP.NET MVC, jQuery, HTML/CSS",
        description: [
            "Primary developer of a C# ASP.NET MVC web application that empowered users to autonomously customize data entry forms and display templates, reducing turnaround time for UI updates by 95% and eliminating dependency on developer interventions",
            "Partnered with stakeholders to decompose features into actionable tasks, provide time estimates, and prioritize deployments based on user impact. Established feedback loops using customer metrics to drive iterative improvements",
            "Applied coding standards and best practices through code reviews, wrote maintainable and extensible code with guidance, used debugging tools to proactively and reactively resolve issues, ensuring code quality and reliability",
            "Developed RESTful APIs to enable seamless integration with internal systems, standardizing data exchange and reducing manual workflows"
        ]
    }
];

function Experiences(): JSX.Element {
    return (
        <WindowBox name="Experiences" width={0.5} content={
            <div className="p-1 m-1 sm:m-3">
                <Tabs>
                    <TabList>
                        {experiences.map((experience, index) =>
                            <Tab key={index}>
                                {experience.company}
                            </Tab>
                        )}
                    </TabList>

                    <div className="tab-panels">
                        {experiences.map((experience, index) =>
                            <TabPanel key={index}>
                                <ExperienceTab experience={experience} />
                            </TabPanel>
                        )}
                    </div>
                </Tabs>
            </div>
        }/>
    );
}

export default Experiences;