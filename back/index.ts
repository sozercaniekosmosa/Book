import {fileURLToPath} from 'url';
import path, {dirname} from 'path';
import {config} from "dotenv";
import {createWebServer, TCallbackWS} from "./lib/services/webServer/WebServer.js";
import routerGeneral from "./lib/services/webServer/api-v1/general";
// import {convertExcelToXData} from "./lib/reports/import2";
// import {CalcDensity} from "../assemblyScript/build/debug";
import {Express} from "express";
import glob from "../front/src/glob";

// console.log(pg)

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const env = config({override: true, path: '../.env'});
const {
    PORT,
    WEB_DIR,
} = env.parsed

const port = +process.env.PORT || +PORT;

glob.root = __dirname;
glob.port = port
glob.webDir = path.join(__dirname, WEB_DIR);

console.log(WEB_DIR + ' !!!')

const {ws} = createWebServer({
    port: 3000, webDir: glob.webDir,
    clbRouter: (app: Express) => {
        app.use('/api/v1', routerGeneral);
    },
    clbWebSocket: ({arrActiveConnection, type, ws}: TCallbackWS) => {
        if (type == "connection") {
            glob.ws = ws;
            // const loop = () => {
            // add your code ...
            // setTimeout(loop, 1000);
            // }
            // loop();

        }

        // console.log('ws:', type, ws, arrActiveConnection, mess, host)
    }
});

// console.log('OK')

// const q1 = "Реши уравнение 2x-8=15";
// console.log(chalk.yellow("User: ") + q1);
// await addTaskToLLM(q1, (type, chunk) => {
//     if (type != 'process') console.log(chalk.yellow(type));
//     process.stdout.write(chunk as string);
// })


// const sheet = await convertExcelToXSpreadsheet({path: '../tmp/SMCO.xlsx'})
// console.log(JSON.stringify(sheet))

// @ts-ignore
// await reports(sheetData, '../tmp/tst.xlsx')

// const sheets = await convertExcelToXData('../tmp/exp.xlsx');
// console.log(sheets);


//ПЕРЕСЧЕТ ПЛОТНОСТИ НЕФТИ И НЕФТЕПРОДУКТОВ ИЗ ОДНИХ ПАРАМЕТРОВ СРЕДЫ В ДРУГИЕ ПО Р 50.2.076-2010
//double t - температура, к которой нужно пересчитать плотность
//double p - давление, к которой нужно пересчитать плотность
//double measuredT - измеренная температура
//double measuredP - измеренное давление
//double measuredD - измеренная плотность
//byte productType - тип продукта (0 - нефть, 1 - нефтепродукты)
//export function CalcDensity(t: f64, p: f64, measuredT: f64, measuredP: f64, measuredD: f64, productType: u8): f64 {
// console.log(CalcDensity(16.32, 1.28, 27.3, 2.45, 836.15, 0)); // Outputs: 843.3433420320645
