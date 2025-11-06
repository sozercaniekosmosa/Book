import React from 'react';
import './style.css';

const ProgressBar = ({progress}) => {
    return (
        <div className="progress-bar-container">
            <div className="progress-bar" style={{width: `${progress}%`}}>
                {/*{progress}%*/}
            </div>
        </div>
    );
};

export default ProgressBar;