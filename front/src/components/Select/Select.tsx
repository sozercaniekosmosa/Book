import React from 'react';

const Select = ({onChange = null, arrList, value = null, style = {}, className = ''}) => {
    let arr: Array<[any, string]> | [string];

    if (Array.isArray(arrList)) { //если
        arr = arrList.map(it => [it, it]);
    } else {
        arr = Object.entries(arrList);
    }

    let initValue: any;
    if (typeof value == 'string') { // если это сртока
        initValue = value;
    } else if (typeof value == 'number') { // если число
        initValue = arr[value][0];
    } else { // null|false|undefined
        initValue = arr?.[0]?.[0];
    }

    return <select style={style} value={initValue} className={"form-select " + className}
                   onChange={(e) => onChange && onChange(e.target.value)}>{arr.map(([text, val], idi) => {
        return <option value={val as string} key={idi}>{text as string}</option>;
    })}</select>;
}

export default Select;