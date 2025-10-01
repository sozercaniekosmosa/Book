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

async function callGPT({system, user = null, progressID = null}) {
    // textContent = glob.selectedText ?? textContent;
    try {
        const {data: text} = await axios.post(glob.hostAPI + 'gpt', {
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

export const toGPT3 = async ({prompt, source, result, iProp, promptRequirements}) => {
    let countWords: number;

    // const arrStruct = arrMapProp.map(({section, desc, value, example, variants, requirements}, index) => {
    //     if (section) return false;
    //     let mapProp: IMapProp = {desc, value};
    //
    //     variants && (mapProp.variants = variants);
    //     requirements && (mapProp.requirements = requirements); // Если requirements существует
    //
    //     if (promptRequirements && iProp === index) {
    //         if (promptRequirements && value) {
    //             const _value = handleValue(value);
    //             mapProp.requirements =
    //                 promptRequirements + ' ' +
    //                 '('+_value+')' + // Добвляем текущее значение value в промпт
    //                 (_value.endsWith('.') ? '' : '.') + // Если в конце '.' есть то не добавляем
    //                 (mapProp.requirements ?? '');
    //         }
    //
    //         mapProp.value = '';
    //         countWords = handleValue(value).split(' ').length; // Посчитаем слова
    //     }
    //
    //     return mapProp;
    // }).filter(it => it)
    //
    const strSource = JSON.stringify(source, null, 2)
    const strResult = JSON.stringify(result, null, 2)

    // console.log(strSource);

    const promptBuild = template(prompt, {
        source: strSource,
        result: strResult,
        // halfWords: Math.trunc(countWords * .5),
        // x2Words: countWords * 2,
    });

    // console.log(strSource);

    const responseGPT = await callGPT({system: promptBuild, progressID: 'rewrite'});

    return typeof responseGPT == 'string' ? responseGPT.replace(/```json|```/g, '') : responseGPT;

}

export const toGPT = async ({prompt, source, path}) => {
    const strSource = JSON.stringify(source, null, 2)

    const promptBuild = template(prompt, {struct: strSource, path});

    console.log(promptBuild);

    const responseGPT = await callGPT({system: promptBuild, progressID: 'rewrite'});

    return typeof responseGPT == 'string' ? responseGPT.replace(/```json|```/g, '') : responseGPT;

}