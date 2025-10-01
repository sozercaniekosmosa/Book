// Tabs.tsx
import clsx from 'clsx';
import React, {useState, ReactNode, createContext, useContext} from 'react';

interface TabContextType {
    activeKey: string | null;
    setActiveKey: (key: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

interface TabsProps {
    defaultActiveKey?: string;
    activeKey?: string;
    onSelected?: (key: string) => void;
    className?: string;
    children: ReactNode;
    id?: string;
}

export const Tabs = ({
                         defaultActiveKey,
                         activeKey,
                         onSelected,
                         className = '',
                         children,
                         id = '',
                     }: TabsProps) => {
    const [internalActiveKey, setInternalActiveKey] = useState<string>(
        defaultActiveKey || ''
    );

    const resolvedActiveKey = activeKey !== undefined ? activeKey : internalActiveKey;

    const handleSelect = (key: string) => {
        if (onSelected) {
            onSelected(key);
        } else {
            setInternalActiveKey(key);
        }
    };

    return (
        <TabContext.Provider value={{activeKey: resolvedActiveKey, setActiveKey: handleSelect}}>
            <div role="tabs" className={clsx(className, 'flex flex-col')}>
                <div role="tab-buttons" className="flex flex-row border-black/20 border-b px-1">
                    {React.Children.map(children, (child) => {
                        if (!React.isValidElement(child) || child.type !== Tab) return null;

                        const key = child.props.eventKey;
                        const title = child.props.title;

                        return <div
                            key={key}
                            role="tab-button"
                            aria-selected={key === resolvedActiveKey}
                            onClick={() => handleSelect(key)}
                            className={clsx(
                                'px-2 py-1 mt-1 cursor-pointer select-none',
                                'rounded-t-sm border-1 border-inherit border-r-0 border-b-0 last:border-r-1',
                                'transition-colors duration-200 hover:bg-black/20',
                                key === resolvedActiveKey ? 'bg-black/10' : 'bg-none'
                            )}
                        >
                            {title}
                        </div>;
                    })}
                </div>
                <div role="tab-content" className="h-full min-h-0">
                    {React.Children.map(children, (child) => {
                        if (!React.isValidElement(child) || child.type !== Tab) return null;

                        const key = child.props.eventKey;
                        const className = child.props.className;

                        if (key !== resolvedActiveKey) return null;
                        return (
                            <div
                                role="tabpanel"
                                hidden={key !== resolvedActiveKey}
                                className={clsx(
                                    'h-full',
                                    key === resolvedActiveKey ? 'contents' : 'hidden',
                                    className
                                )}
                            >
                                {child.props.children}
                            </div>
                        );
                    })}
                </div>
            </div>
        </TabContext.Provider>
    );
};

interface TabProps {
    eventKey: string;
    title: string;
    className?: string;
    style?: React.CSSProperties;
    children?: ReactNode;
}

export const Tab = ({eventKey, title, className = '', style, children}: TabProps) => {
    return <div role="tab" className={className}>{children}</div>;
};