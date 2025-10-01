import clsx from 'clsx';
import React, {useRef, useState} from 'react';
import Spinner from "./Spinner.tsx";

type DropdownVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
type DropdownSize = 'sm' | 'md' | 'lg';

interface DropdownProps extends React.HTMLAttributes<Element> {
    className?: string;
    isSpinner?: boolean;
    title?: string | any;
    variant?: DropdownVariant;
    size?: DropdownSize;
    children?: React.ReactNode;
}

const DropdownButton: React.FC<DropdownProps> =
    ({className = '', title, variant = 'light', size = 'md', isSpinner = false, children}) => {
        const [isOpen, setIsOpen] = useState(false);
        const [position, setPosition] = useState<DOMRect | null>(null)
        const dropdownRef = useRef<HTMLButtonElement>(null);

        // Map variants to Tailwind classes
        const variantClasses: Record<DropdownVariant, string> = {
            primary: 'bg-blue-600 hover:bg-blue-700 text-white',
            secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
            success: 'bg-green-600 hover:bg-green-700 text-white',
            danger: 'bg-red-600 hover:bg-red-700 text-white',
            warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
            info: 'bg-cyan-600 hover:bg-cyan-700 text-white',
            // light: 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300',
            light: 'st-air st-focus st-air-hover',
            dark: 'bg-gray-800 hover:bg-gray-900 text-white'
        };

        // Map sizes to Tailwind classes
        const sizeClasses: Record<DropdownSize, string> = {
            sm: 'text-xs px-2 py-1',
            md: 'px-2 py-0',
            lg: 'text-lg px-4 py-2'
        };

        return (
            <div className={clsx("relative inline-block text-left rounded-sm")}>
                <button
                    ref={dropdownRef}
                    type="button"
                    onClick={() => {
                        const domRect = dropdownRef.current.getBoundingClientRect();
                        setPosition(domRect);
                        setIsOpen(true);
                    }}
                    className={clsx(
                        'relative text-left text-nowrap',
                        'inline-flex ',
                        'items-center ',
                        // 'justify-center',
                        ' w-full',
                        'rounded-[inherit]', variantClasses[variant], sizeClasses[size],
                        className
                    )}
                >
                    {isSpinner && <Spinner className="opacity-50 !w-[1em] !h-[1em]"/>}
                    <div dangerouslySetInnerHTML={{__html: title}}></div>
                    <svg className="-mr-1 ml-1 h-[16px] w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                         fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                    </svg>
                </button>
                {isOpen && <>
                    <div className="fixed left-0 top-0 w-screen h-screen opacity-0" onClick={() => setIsOpen(false)}
                         style={{zIndex: '99998'}}/>
                    <div onClick={() => setIsOpen(false)}
                         className={clsx("fixed origin-top-left mt-1", "rounded-sm shadow-xl/20", "focus:outline-none ")}
                         style={{
                             left: `${position.left}px`,
                             top: `${position.top + position.height}px`,
                             zIndex: '99999'
                         }}>{children}</div>
                </>}
            </div>
        )
    };

export default DropdownButton;