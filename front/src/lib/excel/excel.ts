import {saveUnitArrayAsFile} from "../fs";

// @ts-ignore
await import( "./exceljs.min.js")

const clearCellStyle = (worksheet, startCell, rowsCount, colsCount) => {

    // Определение диапазона ячеек для очистки
    let startRow = startCell.row;
    let startCol = startCell.col;
    let endRow = startRow + rowsCount - 1;
    let endCol = startCol + colsCount - 1;

    // Очистка стиля ячеек в диапазоне
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const cell = worksheet.getCell(row, col);
            cell.style = {
                font: {name: 'Calibri', family: 2, size: 11, bold: false},
                fill: {type: 'pattern', pattern: 'none', fgColor: {argb: 'FFFFFFFF'}},
                alignment: {vertical: 'bottom', horizontal: 'left'},
                border: {
                    top: {style: 'none'},
                    bottom: {style: 'none'},
                    left: {style: 'none'},
                    right: {style: 'none'}
                }
            };
        }
    }
};

function getMergeRangeForCell(worksheet, rowY, colX) {
    // @ts-ignore
    const merges = Object.values(worksheet._merges).map(it => it.model);

    for (const merge of merges) {
        if (rowY >= merge.top && rowY <= merge.bottom && colX >= merge.left && colX <= merge.right) {
            return merge;
        }
    }

    return null; // Если ячейка не принадлежит ни одному объединенному диапазону
}

const insertLines = (worksheet, {indexRow, quantity}) => {
    const lastRow = worksheet.lastRow.number;
    const lastColumn = worksheet.lastColumn.number;

    const arrStore = [];

    for (let y = indexRow; y <= lastRow; y++) {
        for (let x = 1; x <= lastColumn; x++) {
            const cell = worksheet.getCell(y, x);
            const merged = getMergeRangeForCell(worksheet, y, x);
            arrStore.push([y, x, cell.value, {...cell.style}, merged]);
            cell.value = '';
            cell.style = {};

        }
    }
    let newRow = indexRow + quantity;
    arrStore.forEach(([y, x, val, style, merged]) => {
        const cell = worksheet.getCell(y + newRow, x);
        cell.style = style;
        cell.value = val;
    })
}

const fillData = (worksheet, offX, offY, arrData) => {
    const len = arrData[0].length;
    let arrStyle = null;
    if (offY > 1) {// если строка ниже первой
        arrStyle = [];
        for (let x = 1; x <= len; x++) {
            const cell = worksheet.getCell(offY, x);
            arrStyle.push(cell.style);
        }
    }

    for (let y = 0; y < arrData.length; y++) {
        const arrLine = arrData[y]
        for (let x = 0; x < arrLine.length; x++) {
            const cell = worksheet.getCell(y + offY, x + offX);
            cell.value = arrLine[x];
            cell.style = arrStyle[x % arrStyle?.length];
        }
    }

}

export const readExcelFile = async () => {

    // const a = await fetch("./test.xlsx")
    const resData = await fetch("src/lib/excel/template.xlsx")

    const buffer = await resData.arrayBuffer();

    // @ts-ignore
    const workbook = new ExcelJS.Workbook();
    // Загружаем данные в workbook
    await workbook.xlsx.load(buffer);

    let worksheet = workbook.getWorksheet(1);

    insertLines(worksheet, {indexRow: 3, quantity: 10})
    fillData(worksheet, 1, 2, [
        [0, 1, 2,],
        [3, 4, 5,],
        [6, 7, 8,],
        [9, 10, 11,],
        [12, 13, 14,],
    ])
    // let cell = worksheet.getCell('A1');
    // cell.value = 'ответ';

    // const lastRow = worksheet.lastRow.number;
    // const lastColumn = worksheet.lastColumn.number;
    //
    // const arrFn = ['list', 'sum'];

    // const data = [];
    // for (let row = 1; row <= lastRow; row++) {
    //     for (let col = 1; col <= lastColumn; col++) {
    //         const cell = worksheet.getCell(row, col);
    //         arrFn.forEach(fn => {
    //             if (cell.value?.includes(fn))
    //                 data.push([col, row])
    //         });
    //     }
    // }

    // console.log(data)

    const wbuffer = await workbook.xlsx.writeBuffer()
    saveUnitArrayAsFile('test2.xlsx', wbuffer)

}

export const createExcelFile = async () => {
    // динамически импортируем
    await import( "./exceljs.min.js")

    // @ts-ignore
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Me';
    workbook.lastModifiedBy = 'Her';
    workbook.created = new Date(1985, 8, 30);
    workbook.modified = new Date();
    workbook.lastPrinted = new Date(2016, 9, 27);
    workbook.properties.date1904 = true;
    workbook.calcProperties.fullCalcOnLoad = true;
    workbook.views = [
        {
            x: 0, y: 0, width: 10000, height: 20000,
            firstSheet: 0, activeTab: 1, visibility: 'visible'
        }
    ]
// const sheet = workbook.addWorksheet('My Sheet');
// create a sheet with red tab colour
    workbook.addWorksheet('My Sheet', {
        properties: {tabColor: {argb: 'ff00ff00'}}, //optional paramVal
        views: [
            {showGridLines: false},//optional paramVal
            {state: 'frozen', xSplit: 1, ySplit: 1}//optional paramVal
        ],
        headerFooter: {firstHeader: "Hello Exceljs", firstFooter: "Hello World"},//optional paramVal
        pageSetup: {paperSize: 9, orientation: 'landscape'}//optional paramVal
    });


    let worksheet = workbook.getWorksheet(1);
    // Modify/Add individual cell
    let cell = worksheet.getCell('C1');
    cell.value = 'привет';

    const buffer = await workbook.xlsx.writeBuffer()
    // console.log(buffer)
    saveUnitArrayAsFile('test.xlsx', buffer)
}
