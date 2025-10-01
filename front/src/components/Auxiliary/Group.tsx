const Group = ({children, className = '', style = {}}) => {
    return <div
        className={"st-group flex flex-row *:rounded-none *:first:rounded-l-sm *:last:rounded-r-sm " + className}
        style={style}>
        {children}
    </div>;
}

export default Group;