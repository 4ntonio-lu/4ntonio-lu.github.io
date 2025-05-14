import { JSX } from "react";
import WindowBox from "../elements/WindowBox";
import resumePDF from "../../assets/documents/Antonio Lu Resume.pdf";

function Resume(): JSX.Element {
    return (
        <WindowBox name="Resume" width={0.6} content={
            <div className="window-content resume-content">
                <embed src={resumePDF} type="application/pdf" onMouseDown={(e) => e.stopPropagation()} className="h-[80vh] m-[2px] w-full"/>
            </div>
        }/>
    );
}

export default Resume;