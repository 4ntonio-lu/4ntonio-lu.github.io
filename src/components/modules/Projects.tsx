import { TabList, TabPanel, Tabs, Tab } from "react-tabs";
import { JSX } from "react";
import 'react-tabs/style/react-tabs.css';
import WindowBox from "../elements/WindowBox";
import ProjectTab from '../elements/ProjectTab';
import { img } from "../../assets/images/img";

type Project = {
    name: string;
    src: string;
    skills: string;
    date: string;
    link?: string;
    description: string[];
}

const projects: Project[] = [
    {
        name: "Portfolio",
        src: img.win95,
        skills: "ReactJS, TypeScript, HTML, Tailwind CSS",
        date: "Feb 2025 - May 2025",
        description: [
            "Developed a nostalgic Windows 95 themed portfolio website using TypeScript, ReactJS, and Tailwind CSS, recreating authentic UI elements including draggable windows, desktop icons, and system style dialog boxes to showcase my experiences and projects",
            "Engineered a fully responsive layout with mobile first principles using Tailwind CSS's utility classes and custom breakpoints, ensuring seamless usability across devices from smartphones to 4K monitors while maintaining the retro aesthetic",
            // "Added live stock and crypto market prices application",
            // "Added AI assistant to website"
        ]
    },
    {
        name: "Ticket Tracker",
        src: img.ticketTracker,
        skills: "C#, JavaScript, jQuery, AWS, PostgreSQL, Docker, ASP.NET MVC, HTML/CSS",
        date: "Dec 2023 – Mar 2024",
        description: [
            "Designed and implemented a C# ETL pipeline integrating the SeatGeek API to monitor and analyze ticket pricing data for 500+ concerts, performing data extraction, transformation, and loading into an AWS RDS PostgreSQL database for scalable storage and querying",
            "Containerized the pipeline using Docker and AWS ECR, and deployed it via AWS Lambda to automate data retrieval every four hours, ensuring real time price tracking while optimizing cloud resource costs",
            "Developed a dynamic ASP.NET MVC web application featuring intuitive dashboards by using Chart.js to visualize historical ticket price trends, enabling users to identify pricing patterns at a glance",
            "Architected the solution using SOLID principles, Repository pattern, and Unit of Work pattern to decouple dependencies, improve testability, and maintain clean, scalable code across both the ETL pipeline and MVC application"
        ]
    },
    {
        name: "Mind Kingdom",
        src: img.mindKingdom,
        skills: "Flutter, Android Studio",
        date: "Jan 2023 - May 2023",
        description: [
            "Developed a gamified task management application using Flutter and Android Studio, designed to boost productivity and motivation through interactive features like kingdom building and streak tracking",
            "Implemented a JSON based storage system to securely manage user data, task details, and preferences, ensuring offline accessibility and efficient state management",
            "Integrated device calendar APIs for seamless task reminders and deadlines, alongside dynamic UI components for task creation, prioritization, and progress tracking",
            "Leveraged Flutter’s widget-based architecture for a responsive and visually appealing interface, with features like drag and drop reordering, light/dark mode toggles, and dynamic stats pages",
            "Collaborated in an Agile team to deliver features across sprints, addressing challenges in code optimization and workload distribution while maintaining focus on core functionality"
        ]
    }
];

function Projects(): JSX.Element {
    return (
        <WindowBox
            name="Projects"
            width={0.5}
            content={
                <div className="p-1 m-1 sm:m-3">
                    <Tabs>
                        <TabList>
                            {projects.map((project, index) =>
                                <Tab key={index}>{project.name}</Tab>
                            )}
                        </TabList>

                        <div className="tab-panels">
                            {projects.map((project, index) =>
                                <TabPanel key={index}>
                                    <ProjectTab project={project} />
                                </TabPanel>
                            )}
                        </div>
                    </Tabs>
                </div>
            }
        />
    );
}

export default Projects;