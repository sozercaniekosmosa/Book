import React from "react";
import clsx from "clsx";

let sSpinner = "absolute z-[1] w-[1.7em] h-[1.7em] animate-spin rounded-full border-[1px]";
const Spinner = ({className = ''}) => {
    return <>
        <span className={clsx(sSpinner, "border-b-0 border-l-0 border-black", className)}/>
        <span className={clsx(sSpinner, "border-t-0 border-r-0 border-white", className)}/>
    </>
}

export default Spinner;