export const formatDateTime = (date = new Date(), dateTimeFormat = 'dd.MM.yyyy hh:mm:ss') => {

    const arrMonth = [
        'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
        'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
    ];

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
    const year = date.getFullYear();
    const syear = year % 100;

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const formatMap = {
        'dd': day,
        'MM': month,
        'month': arrMonth[date.getMonth()],
        'yyyy': year,
        'yy': syear,
        'hh': hours,
        'mm': minutes,
        'ss': seconds
    };

    return dateTimeFormat.replace(/dd|MM|yyyy|yy|hh|mm|ss/g, match => formatMap[match]);
}

export const addYear = (y) => new Date(new Date().setFullYear(new Date().getFullYear() + y));
export const addMonth = (m) => new Date(new Date().setMonth(new Date().getMonth() + m));
export const addDay = (d, date) => {
    date = date ?? new Date;
    return new Date(date.setDate((date.getDate() + d)));
};
export const addHour = (h, date) => {
    date = date ?? new Date;
    return new Date(date.setHours(date.getHours() + h));
};
export const addMinute = (m) => new Date(new Date().setMinutes(new Date().getMinutes() + m));
export const addSecond = (s) => new Date(new Date().setSeconds(new Date().getSeconds() + s));

const addZero = (numb) => numb < 10 ? '0' + numb : numb

interface TSetDateParam {
    day?: number,
    hours?: number,
    milliseconds?: number,
    minutes?: number,
    month?: number,
    seconds?: number,
    year?: number
}

export const setDate = ({day, hours, milliseconds, minutes, month, seconds, year}: TSetDateParam) => {
    let currentDate = new Date();
    let newDate = new Date();

    newDate.setFullYear(year ?? currentDate.getFullYear());
    newDate.setMonth(month !== undefined ? month : currentDate.getMonth());
    newDate.setDate(day ?? currentDate.getDate());
    newDate.setHours(hours ?? currentDate.getHours());
    newDate.setMinutes(minutes ?? currentDate.getMinutes());
    newDate.setSeconds(seconds ?? currentDate.getSeconds());
    newDate.setMilliseconds(milliseconds ?? currentDate.getMilliseconds());

    return newDate;
};

export const formatTime = (date) => {
    let hh = addZero(date.getHours());
    let min = addZero(date.getMinutes());
    let ss = addZero(date.getSeconds());
    let fff = date.getMilliseconds();

    return `${hh}:${min}:${ss}${fff !== 0 ? '.' + fff : ''}`;
}

export const formatDate = (date) => {
    let dd = addZero(date.getDate());
    let mm = addZero(date.getMonth() + 1);
    let yyyy = date.getFullYear();

    return `${dd}.${mm}.${yyyy}`;
}

export const secondsToTime = seconds => new Date(seconds * 1000).toISOString().slice(11, 22);