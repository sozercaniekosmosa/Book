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
export const generateUID = (pre = '') => pre + toShortString(Math.trunc(new Date().getTime() / 1000) + (__id++))
// @ts-ignore
window.generateUID = generateUID;

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

let __counter = 0;
export const getID = (): string => toShortString((new Date()).getTime() + __counter++)

export const isFunction = functionToCheck => functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';

export const isEmpty = obj => Object.keys(obj ?? {}).length === 0;

export const isObject = obj => Object.prototype.toString.call(obj) === '[object Object]';

export const meval = function (js, scope) {
    return new Function(`with (this) { return (${js}); }`).call(scope);
}

/**
 * Wrapper для функции (clbGetData), которая будет вызвана не раньше чем через ms мс. после
 * последнего вызова если в момент тишины с момента последнего вызова будет произведен
 * еще вызов то реальный вызов будет не раньше чем через ms мс. после него
 * @paramVal func
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
type ThrottledFunction<T extends (...args: any[]) => any> = (...args: Parameters<T>) => ReturnType<T>;

export function throttle<T extends (...args: any[]) => any>(
    func: T,
    timeMs: number
): ThrottledFunction<T> {
    let lastFunc: ReturnType<typeof setTimeout>;
    let lastRan: number;
    let lastArgs: Parameters<T>;
    let lastThis: any;

    // @ts-ignore
    return function (this: any, ...args: Parameters<T>): ReturnType<T> {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastArgs = args;
            lastThis = this;
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= timeMs) {
                    func.apply(lastThis, lastArgs);
                    lastRan = Date.now();
                }
            }, timeMs - (Date.now() - lastRan));
        }
    } as ThrottledFunction<T>;
}

// Пример использования
const logMessage = (message: string) => {
    console.log(message);
};

// export const throttle = (clbGetData, ms) => {
//
//     let isThrottled = false,
//         savedArgs,
//         savedThis;
//
//     function wrapper(...arg) {
//
//         if (isThrottled) { // (2)
//             savedArgs = arguments;
//             savedThis = this;
//             return;
//         }
//
//         clbGetData.apply(this, arguments); // (1)
//
//         isThrottled = true;
//
//         setTimeout(function () {
//             isThrottled = false; // (3)
//             if (savedArgs) {
//                 wrapper.apply(savedThis, savedArgs);
//                 savedArgs = savedThis = null;
//             }
//         }, ms);
//     }
//
//     return wrapper;
// }

export const asyncDelay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Создает worker на лету:
 * // demo
 * const add = (...nums) => nums.reduce((a, b) => a + b);
 * // call
 * console.log('result: ', await add.callAsWorker(null, 1, 2, 3));
 *
 * @paramVal args of function
 * @returns {Promise<unknown>}
 */
// @ts-ignore
Function.prototype.callAsWorker = function (...args) {
    return new Promise((resolve, reject) => {
        const code = `self.onmessage = e => self.postMessage((${this.toString()}).call(...e.data));`,
            blob = new Blob([code], {type: "text/javascript"}),
            worker = new Worker(window.URL.createObjectURL(blob));
        worker.onmessage = e => (resolve(e.data), worker.terminate());
        worker.onerror = e => (reject(e.message), worker.terminate());
        worker.postMessage(args);
    });
}

// перемещает элемент массива на новое место
export const arrMoveItem = (arr, fromIndex, toIndex) => {
    if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
        throw new Error('Индексы выходят за пределы массива');
    }

    // Извлекаем элемент из старого индекса
    const element = arr.splice(fromIndex, 1)[0];

    // Вставляем элемент на новый индекс
    arr.splice(toIndex, 0, element);

    return arr;
};

/**
 * получает элемент из объекта по заданому пути
 * @param obj - объект
 * @param arrPath - ['key1', 'key2', 'key3', ... ]
 */
export const getObjectByPath = (obj: any, arrPath: string[]): [any, string] => {
    for (let i = 0; i < arrPath.length - 1; i++) {
        const k = arrPath[i];
        if (obj?.[k]) {
            obj = obj[k];
        } else {
            return [null, null];
        }
    }
    return [obj, arrPath[arrPath.length - 1]];
}

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

export interface WalkAndFilterCallback {
    parent: any | null;
    key: string | number | null;
    value: any;
    hasChild: boolean;
    arrPath: string[]; // путь от корня до текущего элемента
};

/**
 * Последовательный итеративный обход дерева + фильтрация.
 * Если callbackFilter вернёт null для узла — узел и его потомки исключаются.
 */

export function walkAndFilter<T = any>(
    tree: T,
    callbackFilter: (p: WalkAndFilterCallback) => any | null
): T | null {
    if (tree === null || typeof tree !== "object") {
        const keep = callbackFilter({
            parent: null,
            key: null,
            value: tree,
            hasChild: false,
            arrPath: []
        });
        return keep === null ? null : (keep as T);
    }

    type StackItem = {
        node: any; // исходный узел (для передачи в callback мы используем node)
        parent: any | null; // исходный родитель (для передачи в callback)
        key: string | number | null; // ключ в исходном родителе
        resultParent: any | null; // куда записывать результат
        resultKey: string | number | null; // ключ в resultParent
        path: string[]; // путь до узла
    };

    let resultRoot: any = Array.isArray(tree) ? [] : {};
    const stack: StackItem[] = [
        {
            node: tree,
            parent: null,
            key: null,
            resultParent: null,
            resultKey: null,
            path: []
        }
    ];

    while (stack.length) {
        const item = stack.pop()!;
        const {node, parent, key, resultParent, resultKey, path} = item;

        const isNodeObject = node !== null && typeof node === "object";
        const hasChild = isNodeObject
            ? (Array.isArray(node) ? node.length > 0 : Object.keys(node).length > 0)
            : false;

        // вызываем callback на ОРИГИНАЛЬНОМ узле — он может вернуть:
        // - null  => отсекаем узел
        // - значение (примитив / объект / массив) => оно заменяет node для дальнейшего обхода
        const keep = callbackFilter({
            parent,
            key,
            value: node,
            hasChild,
            arrPath: path
        });

        if (keep === null) continue;

        // current — значение, которое ПОЛЬЗУЕТСЯ ДАЛЕЕ в обходе (замена узла)
        const current = keep;
        const isCurrentObject = current !== null && typeof current === "object";

        // если current — примитив, просто положим его в результат
        if (!isCurrentObject) {
            const value = current;
            if (resultParent === null) {
                resultRoot = value;
            } else if (Array.isArray(resultParent)) {
                (resultParent as any)[resultKey as number] = value;
            } else {
                (resultParent as any)[resultKey as string] = value;
            }
            continue;
        }

        // current — объект/массив. Создаём соответствующий контейнер в результате.
        const newContainer = Array.isArray(current) ? [] : {};
        if (resultParent === null) {
            resultRoot = newContainer;
        } else if (Array.isArray(resultParent)) {
            (resultParent as any)[resultKey as number] = newContainer;
        } else {
            (resultParent as any)[resultKey as string] = newContainer;
        }

        // IMPORTANT:
        // Для дальнейшего обхода (добавления детей в стек) используем **сам current**
        // (то есть именно то значение, которое вернул callback). При этом в качестве
        // parent для детей передаём current — так callback при вызове для ребёнка
        // увидит реального родителя (уже замещённый).
        if (Array.isArray(current)) {
            for (let i = current.length - 1; i >= 0; i--) {
                stack.push({
                    node: current[i],
                    parent: current, // parent — это current (заменённый узел)
                    key: i,
                    resultParent: newContainer,
                    resultKey: i,
                    path: [...path, String(i)]
                });
            }
        } else {
            const keys = Object.keys(current);
            for (let i = keys.length - 1; i >= 0; i--) {
                const k = keys[i];
                stack.push({
                    node: current[k],
                    parent: current,
                    key: k,
                    resultParent: newContainer,
                    resultKey: k,
                    path: [...path, k]
                });
            }
        }
    }

    return resultRoot as T;
}


// let root = {
//     a: {
//         aa: {
//             arr_aa: [1, 2, 3]
//         },
//         ab: {
//             arr_ab: [4, 5, 6]
//         },
//     },
//     b: {
//         ba: {
//             baa: {
//                 skip: true,
//                 arr_baa: [7, 8, 9]
//             },
//             bab: '123'
//         },
//         bb: {
//             arr_bb: [10, 11, 12]
//         },
//     }
// };
// Пример:
// const a = walkAndFilter(
//     root, (parent, key, value, hasChild, arrPath) => {
//         // console.log(parent, key, value, hasChild);
//         // if (value?.skip) return null;
//         // if (key == 'arr_baa') return null;
//         if (value % 2) return null;
//         !hasChild && console.log(arrPath.join('.') + ' = ' + value);
//         return value;
//     }
// );
//
//
// // console.log(root)
// console.log(a)