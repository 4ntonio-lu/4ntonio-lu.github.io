import { JSX } from "react";
import WindowBox from "../elements/WindowBox";
import resumePDF from "../../assets/documents/Antonio Lu Resume.pdf";

function Resume(): JSX.Element {
    return (
        <WindowBox name="Resume" width={0.6} content={
            <div className="window-content resume-content">
                <iframe src={resumePDF} className="h-[80vh] w-full m-[2px]" onMouseDown={(e) => e.stopPropagation()} title="Resume PDF"/>
            </div>
        }/>
    );
}

export default Resume;