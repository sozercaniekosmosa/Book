import fs, {promises as fsPromises} from 'fs'
import PATH from "path";
import * as console from "node:console";
import * as util from "node:util";
import {constants} from 'fs';

export const readFileAsync = async (path, options?) => {
    try {
        const data = await fsPromises.readFile(path, options);
        return data;
    } catch (err) {
        throw 'Ошибка чтения файла: ' + path
    }
};

export const writeFileAsync = async (filePath, data) => {
    try {

        const dir = PATH.dirname(filePath)

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }
        await fsPromises.writeFile(filePath, data);
    } catch (err) {
        throw 'Ошибка записи файла: ' + filePath
    }
};

export async function getDirectories(srcPath) {
    const files = await fsPromises.readdir(srcPath);
    const directories = [];
    try {
        for (const file of files) {
            const filePath = PATH.join(srcPath, file);
            const stat = await fsPromises.stat(filePath);
            if (stat.isDirectory()) {
                directories.push(file);
            }
        }
    } catch (error) {
        console.error(`Ошибка при получении директорий ${srcPath}: ${error.message}`);
    }
    return directories;
}

export async function getDataFromArrayPath(arrPaths) {
    const filesContent = [];

    for (const p of arrPaths) {
        try {
            const stat = await fsPromises.stat(p);
            if (stat.isFile()) {
                const content = await readFileAsync(p, 'utf-8'); // Чтение содержимого файла
                filesContent.push({path: p, content}); // Сохраняем путь и содержимое
            } else if (stat.isDirectory()) {
                // Если это директория, получаем все файлы внутри
                const dirFiles = await fsPromises.readdir(p);
                const fullPaths = dirFiles.map(file => PATH.join(p, file));
                const nestedContent = await getDataFromArrayPath(fullPaths); // Рекурсивно получаем содержимое файлов из поддиректорий
                filesContent.push(...nestedContent);
            }
        } catch (error) {
            console.error(`Ошибка при обработке пути ${p}: ${error.message}`);
        }
    }

    return filesContent;
}

const isFileAvailable = async (path) => {
    try {
        const handle = await fsPromises.open(path, fs.constants.O_RDONLY);
        await handle.close(); // Закрываем файл после проверки
        return true;
    } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EPERM') {
            console.warn(`Файл ${path} занят или недоступен:`, error.message);
            return false;
        }
        throw error; // Для других ошибок выбрасываем исключение
    }
};

export const renameFile = async (path, toPath) => {
    new Promise<void>((resolve, reject) => {
        try {
            fs.rename(path, toPath, function (err) {
                if (err) {
                    console.log('ERROR: ' + err);
                    reject(err)
                } else {
                    resolve()
                }
            });
        } catch (error) {
            reject(error)
            throw error;
        }
    })
};

export const removeFile = async (path) => {
    try {
        fs.unwatchFile(path)
        fs.unlinkSync(path)
    } catch (error) {
        throw error;
    }
};

export const copyFile = async (pathSrc, pathDest) => {
    try {
        try {
            await fsPromises.access(pathDest);
            console.log('Файл уже существует в целевой директории.');
        } catch (err) {
            if (err.code === 'ENOENT') {
                try {
                    await fsPromises.copyFile(pathSrc, pathDest);
                    console.log('Файл успешно скопирован.');
                } catch (copyErr) {
                    console.error('Ошибка при копировании файла:', copyErr);
                    throw copyErr;
                }
            } else {
                console.error('Ошибка при проверке существования файла:', err);
            }
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
};

export async function checkFileExists(filePath) {
    try {
        await fsPromises.access(filePath);
        console.log(`Файл ${filePath} существует.`);
        return true;
    } catch (error) {
        console.log(`Файл ${filePath} не существует.`);
        return false;
    }
}

export async function createAndCheckDir(filePath) {
    // Получаем директорию из пути
    // const dir = PATH.dirname(filePath);

    // Проверяем, существует ли директория, если нет - создаем
    await fsPromises.mkdir(filePath, {recursive: true});
}

export async function saveTextToFile(filePath, text) {
    try {
        await createAndCheckDir(filePath);

        // Записываем текст в файл
        await fsPromises.writeFile(filePath, text, 'utf8');

        console.log(`Файл успешно сохранен по пути: ${filePath}`);
    } catch (error) {
        console.error('Ошибка при сохранении файла:', error);
    }
}

// Промисификация fs.readdir
const readdir = util.promisify(fs.readdir);
// Промисификация fs.stat
const stat = util.promisify(fs.stat);

export const getDirAll = async (directory) => {
    const len = directory.length;
    let arrDir = [];

    async function traverseDirectory(currentPath) {
        const items = await readdir(currentPath);
        let hasSubdirectories = false;
        for (const item of items) {
            const itemPath = PATH.join(currentPath, item);
            const itemStats = await stat(itemPath);

            if (itemStats.isDirectory()) {
                // arrDir.push(itemPath);
                hasSubdirectories = true;
                await traverseDirectory(itemPath);
            }
        }

        if (!hasSubdirectories) {
            arrDir.push(currentPath.substring(len + 1).split('\\'));//.replaceAll(/\\/g, ','));
        }
    }

    await traverseDirectory(directory);
    return arrDir;
};

export const findExtFiles = async (directory, ext, isDeep = true) => {
    let files = [];

    async function traverseDirectory(currentPath) {
        const items = await readdir(currentPath);

        for (const item of items) {
            const itemPath = PATH.join(currentPath, item);
            const itemStats = await stat(itemPath);

            if (itemStats.isDirectory()) {
                if (isDeep) await traverseDirectory(itemPath);
            } else if (itemStats.isFile() && (PATH.extname(itemPath) === '.' + ext || ext === undefined)) {
                files.push(itemPath);
            }
        }
    }

    await traverseDirectory(directory);
    return files;
};

export const findExtFilesAbs = async (directory, ext = 'png') => {
    let files = [];

    async function traverseDirectory(currentPath) {
        const items = await readdir(currentPath, {withFileTypes: true});

        for (const item of items) {
            const itemPath = PATH.resolve(currentPath, item.name);

            if (item.isDirectory()) {
                await traverseDirectory(itemPath);
            } else if (item.isFile() && PATH.extname(item.name) === '.' + ext) {
                files.push(itemPath);
            }
        }
    }

    await traverseDirectory(directory);
    return files;
};

export async function removeDir(targetPath) {
    try {
        // Нормализация и проверка пути
        const normalizedPath = PATH.normalize(targetPath);
        const absolutePath = PATH.resolve(process.cwd(), normalizedPath);

        // Защита от выхода за пределы корневой директории
        const rootDir = process.cwd();
        if (!absolutePath.startsWith(rootDir)) {
            throw new Error('Попытка удаления директории вне корневой папки проекта');
        }

        // Проверка существования пути
        try {
            await fsPromises.access(absolutePath);
        } catch {
            throw new Error('Директория не существует');
        }

        // Проверка что это действительно директория
        const stats = await fsPromises.stat(absolutePath);
        if (!stats.isDirectory()) {
            throw new Error('Указанный путь не является директорией');
        }

        // Удаление с защитой от симлинков
        await fsPromises.rm(absolutePath, {
            recursive: true,
            force: false, // не игнорировать ошибки
            maxRetries: 3, // попытки для устойчивых ошибок
        });

        console.log('Папка и её содержимое успешно удалены');
    } catch (err) {
        console.error('Ошибка при удалении:', err);
        // Пробрасываем ошибку для обработки в вызывающем коде
        throw err;
    }
}