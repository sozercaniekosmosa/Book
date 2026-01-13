import {fileToBase64} from "../../lib/fs.ts";
import {template} from "../../lib/strings.ts";
import {CallbackParams} from "./BookTreeEditor.tsx";
import {
    addImage,
    convertBase64ImageFormat,
    mergeBase64Images,
    openBase64ImageInNewTab,
    toImageGenerate
} from "./general.utils.ts";
import {extractCommonValues} from "./headers.tsx";
import {useBookStore, useImageStore} from "./store/storeBook.ts";
import {promptImageCharacter, promptImageObject, promptImageScene} from "./prompts.ts";
import {getValueByPath} from "../../lib/utils.ts";

export const LoadImage = async (file: File, props: CallbackParams) => {
    const imgBase64 = await fileToBase64(file);
    const webpBase64 = await convertBase64ImageFormat(imgBase64, 'image/webp')
    await useImageStore.getState().addImages(props.keyName + '', webpBase64)
}
export const generateImage = async (
    {prompt, imgBase64 = null, props, type}: {
        prompt: string,
        imgBase64?: string,
        props: CallbackParams,
        type: null | 'scene' | 'character' | 'object'
    }) => {

    let param: any;

    if (type === 'object') {
        param = {aspect_ratio: '1:1', resolution: '1K'};
    } else if (type === 'scene') {
        param = {aspect_ratio: '16:9', resolution: '2K'};
    } else if (type === 'character') {
        param = {aspect_ratio: '3:4', resolution: '1K'};
    }

    if (imgBase64) {
        param = {...param, arrImage: [imgBase64]};
    }

    const imgB64 = await toImageGenerate({prompt, param});
    await useImageStore.getState().addImages(props.keyName + '', imgB64)
}

export const getPromptImageCharacter = async (props: CallbackParams) => {
    let book = useBookStore.getState().book;

    const arrPath = [
        [...props.path, 'Тело/физические характеристики'],
        [...props.path, 'Стиль и визуальные особенности']
    ]

    const arr = extractCommonValues(arrPath as string[][]);
    let styleGeneral = book?.['Общие']?.['Визуальный стиль изображений']?.value;
    let styleCharacter = book?.['Персонажи']?.['Визуальный стиль персонажей']?.value;
    return template(promptImageCharacter, null, {styleGeneral, styleCharacter, desc: arr.join('\n')});
}

export const getPromptImageObject = async (props: CallbackParams) => {
    let book = useBookStore.getState().book;


    const arrPath = [
        [...props.path, 'Основные'],
        [...props.path, 'Визуальные характеристики'],
        [...props.path, 'Физические характеристики'],
    ]

    const arr = extractCommonValues(arrPath as string[][]);
    let styleGeneral = book?.['Общие']?.['Визуальный стиль изображений']?.value;
    return template(promptImageObject, null, {styleGeneral, desc: arr.join('\n')});
}

export const getPromptImageScene = async (props: CallbackParams) => {
    let book = useBookStore.getState().book;

    let images = useImageStore.getState().images;
    const arr = useImageStore.getState().frame?.[props.keyName] ?? [];

    let imgScene: string = '';
    let arrImgCharacter: string[] = [];
    let arrDescCharacter: string[] = [];
    arr.forEach((halfPath) => {
        const [name, index] = halfPath.split('.');
        const imgBase64 = images[name][index];
        if (!imgBase64) return;
        if (name.includes('Персонаж')) {
            arrImgCharacter.push(imgBase64);
            const desc = book['Персонажи']['Второстепенные персонажи'][name]['Имя полное'].value.split('-')[0].trim();
            arrDescCharacter.push(desc)
        }
        if (name.includes('Главный')) {
            arrImgCharacter.push(imgBase64);
            const desc = book['Персонажи']['Главный герой']['Имя полное'].value.split('-')[0].trim();
            arrDescCharacter.push(desc)
        }
        if (name.includes('Антагонист')) {
            arrImgCharacter.push(imgBase64);
            const desc = book['Персонажи']['Антагонист']['Имя полное'].value.split('-')[0].trim();
            arrDescCharacter.push(desc)
        }
        if (name.includes('Объект')) {
            arrImgCharacter.push(imgBase64);
            const desc = book['Все объекты']['Объекты'][name]['Название'].value.split('-')[0].trim();
            arrDescCharacter.push(desc)
        }
        if (name.includes('Сцена')) imgScene = imgBase64;
    })

    const img = await mergeBase64Images({
        images: arrImgCharacter,
        gap: 10,
        backgroundColor: 'black',
        outputFormat: 'image/webp',
        jpegQuality: 1,
        scaleFactor: 0.5
    });

    const imgBase64 = await addImage(img, 'image/webp', 100);

    const _scene = getValueByPath(book, props.path);
    const imageDesc = arrDescCharacter.join(', ');
    const style = book?.['Общие']?.['Визуальный стиль изображений']?.value;
    const scene = _scene['Описание сцены'].value;
    const characters = _scene['Сущности'].value;
    const events = _scene['События'].value;

    const prompt = template(promptImageScene, null, {
        imageDesc, scene, style, characters, events
    });

    return {prompt, imgBase64};
}

export const pasteImageFromClipboard = (items: DataTransferItemList, props: CallbackParams) => {
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            const reader = new FileReader();
            reader.onloadend = async function (evt) {
                const webpBase64 = await convertBase64ImageFormat(evt.target.result as string, 'image/webp')
                await useImageStore.getState().addImages(props.keyName + '', webpBase64)
            };
            reader.readAsDataURL(file);
        }
    }
}