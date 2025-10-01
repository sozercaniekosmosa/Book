import {generateUID} from "./utils.ts";
import {INodeProp} from "../components/Editor/node-ui/svg.ts";

export const createTable = (cols: number, rows: number, clb: (obj: {}) => void, classTable: string) => {
    // Создаем div для таблицы
    let table = document.createElement('div');
    classTable && table.classList.add(classTable)
    table.style.display = 'table';

    for (var i = 0; i < rows; i++) {
        // Создаем div для строки
        var row = document.createElement('div');
        row.style.display = 'table-row';

        for (var j = 0; j < cols; j++) {
            var cell = document.createElement('div');
            cell.style.display = 'table-cell';
            clb({table, row, cell, x: i, y: j, index: i * cols + j});

            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    return table;
}

export const getHtmlStr = (html: string) => {
    const template = document.createElement('template'), content = template.content;
    template.innerHTML = html.trim(); // Never return a text node of whitespace as the result;
    return content.childNodes.length ? content.childNodes : [content.firstChild];
};

export function textToHtmlNodes(htmlString: string): ChildNode[] {
    // Создаем временный контейнер
    const tempContainer = document.createElement('template');

    // Вставляем HTML-код в контейнер
    tempContainer.innerHTML = htmlString.trim().replace(/[\r\n]|(>)\s*(<)/g, '$1$2');

    // Извлекаем дочерние узлы и возвращаем их в виде массива
    return Array.from(tempContainer.content.childNodes);
}

export const setStyle = (strStyle, cssObjectID = generateUID('st')) => {
    let destNode = document.head;
    let node = destNode.querySelector('.' + cssObjectID);
    strStyle = strStyle.replaceAll(/[\r\n]| {2}/g, '')
    if (!node)
        destNode.append(getHtmlStr(`<style class='${cssObjectID}'>${strStyle}</style>`)[0]);
    else
        node.innerHTML = strStyle;

    return node;
}

const camelToKebab = (camelCaseString: string): string => {
    return camelCaseString.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

const setProperty = (node: Element, arg: INodeProp): Element => {
    Object.entries(arg).forEach(([key, val]) => {
        if (key == 'to') {
            (val as SVGElement).append(node);
        } else if (key == 'data') {
            val && Object.entries(val).forEach(([k, v]) => (node as HTMLElement).dataset[k] = String(v));
        } else if (key == 'text') {
            node.textContent = val;
        } else if (key == 'html') {
            node.innerHTML = val;
        } else if (key == 'id') {
            node.id = val;
        } else if (key == 'class') {
            node.classList.value = (typeof val === 'string') ? val : val.join(' ');
        } else {
            node.setAttribute(camelToKebab(key), val)
        }
    });
    return node;
}

let tempNodeForHtml: Element;
export const getDimensionBox = (content: string, css?: string): DOMRect => {
    // Добавляем HTML элемент
    let id = 'node-calc-size';
    // @ts-ignore
    const rest = content.includes('\n') ? {html: content.replaceAll('\n', '<br>')} : {html: content};

    let prop = {x: 0, y: 0, opacity: 0, id, ...rest};
    css && (prop["class"] = css)

    if (!tempNodeForHtml || !document.body.contains(tempNodeForHtml)) {
        tempNodeForHtml = document.querySelector('#' + id);
        if (!tempNodeForHtml) {
            tempNodeForHtml = document.createElement('div') as Element;
            // @ts-ignore
            tempNodeForHtml.style.opacity = 0
            document.body.append(tempNodeForHtml)
        }
    }
    tempNodeForHtml = setProperty(tempNodeForHtml, prop) as HTMLHtmlElement;
    return tempNodeForHtml.getBoundingClientRect();
}

export const getElementDimensions = (element: HTMLElement): { width: number; height: number } => {
    // Создаём контейнер для изоляции клона
    const container = document.createElement('div');

    // Стилизируем контейнер, чтобы не влиять на вёрстку
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.visibility = 'hidden';

    // Клонируем элемент со всеми дочерними элементами и стилями
    const clone = element.cloneNode(true) as HTMLElement;

    // Добавляем клон в контейнер
    container.appendChild(clone);
    document.body.appendChild(container);

    // Получаем размеры клона
    const rect = clone.getBoundingClientRect();

    // Удаляем контейнер из DOM
    document.body.removeChild(container);

    return {
        width: rect.width,
        height: rect.height
    };
};

let tempSpan: HTMLElement;
export const getFontHeight = (node: Element) => {
    // Получаем рассчитанные стили переданного элемента
    const computedStyle = window.getComputedStyle(node);

    // Собираем строку font shorthand из стилей элемента
    const fontStr = [
        computedStyle.fontStyle,
        computedStyle.fontVariant,
        computedStyle.fontWeight,
        `${computedStyle.fontSize}/${computedStyle.lineHeight}`,
        computedStyle.fontFamily
    ].join(' ');

    // Создаем временный элемент для измерения
    if (!tempSpan) {
        tempSpan = document.createElement('span');
        document.body.appendChild(tempSpan);
    }
    tempSpan.style.cssText = `
        font: ${fontStr};
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
    `;
    tempSpan.textContent = 'Hg'; // Символы с верхними и нижними выносными элементами

    const height = tempSpan.offsetHeight;
    // document.body.removeChild(tempSpan);

    return height;
};

interface Position {
    top: number;
    left: number;
    width: number;
    height: number;
}

export const getAbsolutePosition = (element: HTMLElement): Position => {
    const rect = element.getBoundingClientRect();

    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
    };
};