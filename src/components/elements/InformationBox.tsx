import { JSX } from 'react';

type InformationBoxProps = {
  title: string;
  content: string;
  classes: string;
};

function InformationBox({ title, content, classes }: InformationBoxProps): JSX.Element {
  return (
    <fieldset className={classes}>
      <legend className='text-[#272727] ml-2 px-1'>{title}</legend>
      <div className="p-4">
        <p>{content}</p>
      </div>
    </fieldset>
  );
}

export default InformationBox;