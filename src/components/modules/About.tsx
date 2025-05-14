import { JSX } from 'react';
import WindowBox from '../elements/WindowBox';

function About(): JSX.Element {
    return (
        <WindowBox name="About" width={0.33} content={
            <div className='px-8 pt-8 pb-4 max-md:p-6'>
                <h1>Hello! I'm Antonio Lu — welcome to my portfolio website!</h1>
                <br />
                <h3>This website was built with TypeScript, React, and Tailwind CSS, and is inspired by the nostalgic look and feel of Windows 95.</h3>
                <br />
                <h3>I'm a software engineer with a passion for building efficient, user-friendly applications and solving real-world problems with clean, maintainable code.</h3>
                <br />
                <h3>You can explore my resume, experiences, and personal projects through the interactive apps on this website.</h3>
                <br />
                <h3>It's still a work in progress, and I plan to roll out new features soon, so stay tuned!</h3>
                <br />
                <h4 className="lg:hidden">For the best experience, access this website on your computer.</h4>
            </div>
        }/>
    );
}

export default About;