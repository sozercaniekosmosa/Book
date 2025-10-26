import React, {PropsWithChildren, useState} from 'react';
import clsx from "clsx";

interface CheckboxProps extends PropsWithChildren {
    checked?: boolean;
    onChange?: (e: React.KeyboardEvent, checked: boolean) => void;
    className?: string;
}

const Checkbox = ({checked = false, className = '', onChange}: CheckboxProps) => {
    const [isChecked, setIsChecked] = useState(checked);

    const toggle = (e) => {
        setIsChecked(!isChecked);
        onChange?.(e, !isChecked);
    };

    return (
        <div
            onClick={toggle}
            role="checkbox"
            aria-checked={isChecked}
            tabIndex={0}
            onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggle(e);
                }
            }}
            className={clsx(
                'w-4 h-4 border-[1px] border-[#6a7282]',
                'p-[1px] rounded-[2px]',
                'inline-flex items-center justify-center cursor-pointer select-none',
                'hover:bg-black/15 active:bg-black/35',
                className,
            )}
        >
            {isChecked && (
                <svg
                    width="80%"
                    height="80%"
                    viewBox="0 0 16 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M1.5 5.917L5.724 10.5L14.5 1.5"
                        stroke="black"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </div>
    );
};

export default Checkbox;