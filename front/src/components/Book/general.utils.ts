import {isObject} from "../../lib/utils.ts";
import axios from "axios";
import glob from "../../glob.ts";
// import {GPTParams} from "./generator.type.ts";
import {template} from "../../lib/strings.ts";
import {number} from "framer-motion";

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

export async function callGPT({system, user = null, progressID = null, method = 'gpt'}) {
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

    const promptBuild = param ? template(prompt, null, {...param}) : prompt;
    const responseGPT = await callGPT({system: promptBuild, progressID: 'rewrite'});

    return typeof responseGPT == 'string' ? responseGPT.replace(/```json|```/g, '') : responseGPT;

}
export const toImageGenerate = async ({prompt, arrImage = null, param = null}) => {

    try {
        const {data: text} = await axios.post(glob.hostAPI + 'image', {
            prompt,
            arrImage,
            param
        });

        return text;
    } catch (e) {
        console.log(e)
        return null;
    }


}

// 1. Загрузка изображений из base64
export const loadBase64Images = async (base64List: string[]): Promise<HTMLImageElement[]> => {
    const loadedImages: HTMLImageElement[] = [];

    await Promise.all(
        base64List.map(
            (base64) =>
                new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        loadedImages.push(img);
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = base64;
                })
        )
    );

    if (loadedImages.length === 0) {
        throw new Error('No valid images to merge');
    }

    return loadedImages;
};

// 2. Расчёт размеров холста и масштабированных значений
export interface CanvasLayout {
    canvasWidth: number;
    canvasHeight: number;
    scaledGap: number;
    imageScales: { width: number; height: number }[];
}

export const calculateCanvasLayout = (
    images: HTMLImageElement[],
    gap: number,
    scaleFactor: number
): CanvasLayout => {
    if (scaleFactor <= 0 || scaleFactor > 1) {
        throw new Error('scaleFactor must be in range (0, 1]');
    }

    const totalWidth = images.reduce((sum, img) => sum + img.width, 0) + gap * (images.length - 1);
    const maxHeight = Math.max(...images.map((img) => img.height));

    const canvasWidth = Math.max(1, Math.floor(totalWidth * scaleFactor));
    const canvasHeight = Math.max(1, Math.floor(maxHeight * scaleFactor));
    const scaledGap = Math.max(0, Math.floor(gap * scaleFactor));

    const imageScales = images.map((img) => ({
        width: Math.floor(img.width * scaleFactor),
        height: Math.floor(img.height * scaleFactor),
    }));

    return {canvasWidth, canvasHeight, scaledGap, imageScales};
};

// 3. Рендеринг изображений на холст
export const renderImagesOnCanvas = (
    images: HTMLImageElement[],
    layout: CanvasLayout,
    backgroundColor: string,
): HTMLCanvasElement => {
    const {canvasWidth, canvasHeight, scaledGap, imageScales} = layout;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // Заливка фона (обязательна для JPEG)
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    let currentX = 0;
    for (let i = 0; i < images.length; i++) {
        const {width, height} = imageScales[i];
        ctx.drawImage(images[i], currentX, 0, width, height);
        currentX += width + scaledGap;
    }

    return canvas;
};

// 4. Экспорт холста в base64
export const canvasToBase64 = (
    canvas: HTMLCanvasElement,
    outputFormat: 'image/png' | 'image/webp' | 'image/jpeg',
    jpegQuality: number = 0.98
): string => {

    if (jpegQuality < 0 || jpegQuality > 1) {
        throw new Error('jpegQuality must be in range [0, 1]');
    }

    const quality = outputFormat === 'image/jpeg' ? jpegQuality : undefined;

    return canvas.toDataURL(outputFormat, quality);
};

interface MergeBase64ImagesParams {
    images: string[];
    gap?: number;
    backgroundColor?: string;
    scaleFactor?: number;
    outputFormat?: 'image/png' | 'image/webp' | 'image/jpeg';
    jpegQuality?: number;
}

export const mergeBase64Images = async (
    {
        images,
        gap = 10,
        backgroundColor = 'black',
        scaleFactor = 1,
        outputFormat = 'image/jpeg',
        jpegQuality = 0.92
    }: MergeBase64ImagesParams): Promise<string> => {
    const loadedImages = await loadBase64Images(images);
    const layout = calculateCanvasLayout(loadedImages, gap, scaleFactor);
    const canvas = renderImagesOnCanvas(loadedImages, layout, backgroundColor);

    return canvasToBase64(canvas, outputFormat, jpegQuality);
};

/**
 * Конвертирует base64-изображение из одного формата в другой (png/jpeg).
 * При конвертации в JPEG прозрачность заменяется на указанный фон.
 */
export const convertBase64ImageFormat = async (
    base64: string,
    outputFormat: 'image/png' | 'image/webp' | 'image/jpeg',
    backgroundColor: string = 'white',
    jpegQuality: number = 0.92
): Promise<string> => {
    if (jpegQuality < 0 || jpegQuality > 1) {
        throw new Error('jpegQuality must be in range [0, 1]');
    }

    // 1. Загружаем изображение
    const [image] = await loadBase64Images([base64]);

    // 2. Создаём холст того же размера
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;

    // 3. Заливаем фон, если нужен (особенно для JPEG)
    if (outputFormat === 'image/jpeg') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 4. Рисуем изображение
    ctx.drawImage(image, 0, 0);

    // 5. Экспортируем в нужный формат
    return canvasToBase64(canvas, outputFormat, jpegQuality);
};

/**
 * Создаёт новое изображение, вдвое большее по высоте, и размещает исходное изображение по центру по вертикали (в верхней половине).
 * @param imageUrl - URL или base64-строка исходного изображения
 * @param outputFormat - Формат выходного изображения ('jpeg', 'png' и т.д.), по умолчанию 'jpeg'
 * @param prc - процент на который новое изображение больше исходного
 * @returns Promise с base64-строкой нового изображения
 */
export async function addImage(
    imageUrl: string,
    outputFormat: 'image/png' | 'image/webp' | 'image/jpeg' = 'image/jpeg',
    prc: number = 50
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // на случай, если изображение с другого домена

        img.onload = () => {
            const originalWidth = img.width;
            const originalHeight = img.height;

            // Создаём canvas вдвое большей высоты
            const canvas = document.createElement('canvas');
            canvas.width = originalWidth;
            let k = 100 / prc;
            canvas.height = originalHeight * k;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Не удалось получить 2D контекст canvas'));
                return;
            }

            // Заливка фона (опционально, например, белым для JPEG)
            if (outputFormat === 'image/jpeg' || outputFormat === 'image/webp') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            const yPosition = canvas.height - originalHeight;

            ctx.drawImage(img, 0, yPosition, originalWidth, originalHeight);

            // Получаем base64
            const dataUrl = canvas.toDataURL(outputFormat, outputFormat === 'image/jpeg' ? 0.92 : undefined); // качество для JPEG
            resolve(dataUrl);
        };

        img.onerror = (error) => {
            reject(new Error(`Не удалось загрузить изображение: ${error}`));
        };

        img.src = imageUrl;
    });
}

export const openBase64ImageInNewTab = (base64: string, mimeType: 'image/png' | 'image/webp' | 'image/jpeg' = 'image/png') => {
    // Убираем префикс data URL, если он есть
    if (base64.startsWith('data:')) {
        // Извлекаем часть после запятой
        const commaIndex = base64.indexOf(',');
        if (commaIndex !== -1) {
            base64 = base64.substring(commaIndex + 1);
        } else {
            throw new Error('Invalid data URL: no comma found');
        }
    }

    // Убираем возможные пробелы или переносы
    base64 = base64.trim();

    // Проверка: Base64 должен содержать только допустимые символы
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        console.warn('Base64 string may be malformed:', base64.substring(0, 50) + '...');
    }

    // Декодируем Base64 в бинарные данные
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // Создаём Blob
    const blob = new Blob([ia], {type: mimeType});

    // Создаём URL
    const url = URL.createObjectURL(blob);

    // Открываем в новой вкладке
    const win = window.open();
    if (win) {
        win.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Image</title></head>
        <body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh;">
          <img src="${url}" style="max-width:100%; max-height:100vh; object-fit:contain;" />
        </body>
      </html>
    `);
        win.document.close();
    } else {
        console.error('Popup blocked. Please allow popups for this site.');
    }

    // Опционально: освободить URL после загрузки
    // (но в новой вкладке это сложно отследить, так что можно пропустить)
};
