const base64Language = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const toShortString = (value, language = base64Language) => {
    const len = language.length;
    let acc = "";
    while (value > 0) {
        const index = value % len;
        acc += language.charAt(index);
        value /= len;
    }
    return acc.split('').reverse().join('').replace(/^0+/g, '');
};
let __id = 0;

export const generateUID = (pre = '') => pre + toShortString((new Date().getTime()) + Math.ceil(Math.random() * 100) + (__id++))

export const getHashCyrb53 = function (str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export const getHashCyrb53Arr = function (arr, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < arr.length; i++) {
        ch = arr[i];
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export const isFunction = functionToCheck => functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';

export const getRandomRange = (min, max, fix = 2) => {
    return (Math.random() * (max - min) + min).toFixed(fix);
}

export const asyncDelay = ms => new Promise(res => setTimeout(res, ms));

export const isCorrectString = (str) => /^[0-9a-zA-Zа-яА-Я\s\w\!@#$%^&*(),.?":{}|<>;'\[\]\\`~\-+=\/«»—–]+$/.test(str);

export function translit(str) {
    const converter = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
        'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
        'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
        'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ъ': '_',
        'ы': 'y',
        'ь': '_',
        'э': 'e',
        'ю': 'yu',
        'я': 'ya'
    };

    let result = '';
    for (let i = 0; i < str.length; i++) {
        const char = str[i].toLocaleLowerCase();
        result += converter[char] || char;
    }
    return result;
}

/**
 * Wrapper для функции (clbGetData), которая будет вызвана не раньше чем через ms мс. после
 * последнего вызова если в момент тишины с момента последнего вызова будет произведен
 * еще вызов то реальный вызов будет не раньше чем через ms мс. после него
 * @paramVal clbGetData
 * @paramVal ms
 * @returns {(function(): void)|*}
 */
export const debounce = (func, ms) => {
    let timeout;
    return function () {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), ms);
    };
};

/**
 * Wrapper для функции (clbGetData), которую нельзя вызвать чаще чем tm
 * @paramVal clbGetData
 * @paramVal ms
 * @returns {(function(...[*]): void)|*}
 */
export const throttle = (clb, ms) => {

    let isThrottled = false, savedArgs, savedThis;

    function wrapper(...arg) {

        if (isThrottled) { // (2)
            savedArgs = arguments;
            savedThis = this;
            return;
        }

        clb.apply(this, arguments); // (1)

        isThrottled = true;

        setTimeout(function () {
            isThrottled = false; // (3)
            if (savedArgs) {
                wrapper.apply(savedThis, savedArgs);
                savedArgs = savedThis = null;
            }
        }, ms);
    }

    return wrapper;
}

export const removeFragmentsFromUrl = (url) => {
    // Создаем объект URL
    let urlObj = new URL(url);

    // Удаляем фрагмент
    urlObj.hash = '';

    // Возвращаем очищенный URL
    return urlObj.toString();
};

/**
 * Получение из текста js массив имен функций и параметров
 * @paramVal code - текст на js
 * @return [[fn_name, paramVal], [fn_name, paramVal], ... ]
 */
export const getCodeParam = (code: string) => {
    const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)|const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g;
    let match: any[], resArr = [];

    while ((match = functionRegex.exec(code)) !== null) {
        const functionName = match[1] || match[3];
        const params = match[2] || match[4];
        resArr.push([functionName, params])
        // console.log(`Функция: ${functionName}, Параметры: ${params}`);
    }

    return resArr;
}

/**
 * Санитайзинг строки от sql-инъекций
 * @paramVal rawInput
 */
export const sanitizeNoSQLInjection = (rawInput) => rawInput
    // 1. Экранируем кавычки и удаляем опасные символы
    .replace(/(['"\\;`])|(\/\*[\s\S]*?\*\/)|(--[^\r\n]*)/g, (match, p1, p2, p3) => {
        if (p1) return `\\${p1}`;
        return '';
    })
    // 2. Удаляем SQL-ключевые слова (регистронезависимо)
    .replace(/\b(DROP|DELETE|UNION|SELECT|INSERT|UPDATE|TRUNCATE)\b/gi, '')
    // 3. Нормализуем пробелы (опционально)
    .replace(/\s+/g, ' ')
    .trim();