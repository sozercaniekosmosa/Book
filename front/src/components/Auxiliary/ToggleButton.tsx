import React, {useId} from 'react';
import clsx from "clsx";
import {Tooltip, TTooltipDirection} from "./Tooltip.tsx";

interface ToggleButtonProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    hidden?: boolean,
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    title?: string,
    dir?: TTooltipDirection,
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
                                                       checked,
                                                       onChange,
                                                       disabled = false,
                                                       children = null,
                                                       className = '',
                                                       style,
                                                       title = null,
                                                       dir = "right",
                                                       hidden = false,
                                                   }) => {
    const id = useId();


    return <>
        {!hidden && <label
            htmlFor={id}
            className={
                clsx(
                    'relative',
                    'st-air-tx',
                    'st-focus',
                    'inline-flex items-center justify-center p-1 rounded-md cursor-pointer transition-colors duration-300',
                    checked ? 'bg-checked' : 'bg-unchecked',
                    disabled ? 'bg-light-disabled' : '',
                    className)
            }
            style={{boxShadow: (checked ? 'rgba(0, 0, 0, 0.41) 0px 2px 2px 1px inset, rgb(177 177 177) 0px 0px 0px 1px inset' : ''), ...style}}
            role="switch"
            aria-checked={checked}
            tabIndex={0}
        >
            {title && <Tooltip text={title} direction={dir} className="!absolute w-full h-full"/>}
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="hidden"
            />
            {children}
        </label>}</>;
};

export default ToggleButton;