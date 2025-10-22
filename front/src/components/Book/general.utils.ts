import {isObject} from "../../lib/utils.ts";
import axios from "axios";
import glob from "../../glob.ts";
// import {GPTParams} from "./generator.type.ts";
import {template} from "../../lib/strings.ts";

export const handleValue = (value: string) => {
    let strValue: string;
    if (typeof value === 'string') {
        strValue = value;
    } else if (Array.isArray(value)) { // массив?
        strValue = (value as []).map(it => {
            return isObject(value) ? Object(value).value.map((it: any) => it).join('\n') : it;
        }).join('\n')
    } else if (isObject(value)) { // объект?
        strValue = Object(value).value.map((it: any) => JSON.stringify(it, null, 2)).join('\n')
    }
    return strValue;
}

// export const fillData = (arrMapProp: IMapProp[], arrData: any[], clb: (i: number, value: any) => void) => {
//     let iProp = 0, arrDifference = [];
//     for (let i = 0; i < arrMapProp.length && iProp < arrData.length; i++) {
//         if (!arrMapProp[i]?.section) {
//             if (arrMapProp[i].value.length > 2 && arrMapProp[i].value != arrData[iProp].value) {
//                 arrDifference.push([iProp, arrMapProp[i].value, arrData[iProp].value]);
//             } else {
//                 clb(i, arrData[iProp].value);
//             }
//             iProp++;
//         }
//     }
//     arrDifference.length && console.log(...arrDifference);
// }

async function callGPT({system, user = null, progressID = null, method = 'gpt'}) {
    // textContent = glob.selectedText ?? textContent;
    try {
        const {data: text} = await axios.post(glob.hostAPI + method, {
            user,
            system,
            progressID
        });

        return text;
    } catch (e) {
        console.log(e)
        return null;
    }
}

export const toGPT = async (prompt: string, param?: any) => {

    const promptBuild = param ? template(prompt, {...param}) : prompt;
    const responseGPT = await callGPT({system: promptBuild, progressID: 'rewrite'});

    return typeof responseGPT == 'string' ? responseGPT.replace(/```json|```/g, '') : responseGPT;

}
export const toImageGenerate = async ({prompt}) => {

    try {
        const {data: text} = await axios.post(glob.hostAPI + 'image', {
            prompt,
            arrImage: null,
        });

        return text;
    } catch (e) {
        console.log(e)
        return null;
    }


}