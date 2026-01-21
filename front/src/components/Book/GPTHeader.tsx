import {CallbackParams} from "./BookTreeEditor.tsx";
import React, {useCallback, useEffect} from "react";
import {eventBus} from "../../lib/events.ts";
import {useBookStore, useImageStore} from "./store/storeBook.ts";
import {template} from "../../lib/strings.ts";
import {generateUID, getObjectByPath, getValueByPath, isEmpty, isEqualString, walkAndFilter} from "../../lib/utils.ts";
import {toGPT} from "./general.utils.ts";
import {fnPromptTextHandling, promptImageScene, promptWrite} from "./prompts.ts";
import ButtonEx from "../Auxiliary/ButtonEx.tsx";
import clsx from "clsx";
import {
    BsArrowsCollapse,
    BsArrowsFullscreen, BsCheckAll, BsCircleHalf,
    BsCloudRain,
    BsEmojiFrown,
    BsEmojiSmile, BsLightning,
    BsStars,
    BsSun,
    BsThreeDotsVertical
} from "react-icons/bs";
import DropdownButton from "../Auxiliary/DropdownButton.tsx";
import {GoStarFill} from "react-icons/go";
import {ImMan} from "react-icons/im";
import {CSS_BTN, extractCommonValues} from "./headers.tsx";

let total = 0;

const applyGPTResult = (resultStruct: any, listPathSrc: {}) =>
    walkAndFilter(resultStruct, ({value}) => {
        if (value?.hasOwnProperty('id')) {
            const id = value.id;
            let val = value?.target?.replaceAll?.(/\n\n/g, '\n');
            if (typeof val != 'string') return value;

            const path = listPathSrc[id];
            if (!path) return value;
            const [obj, _] = getObjectByPath(useBookStore.getState().book, path);
            if (obj?.hasOwnProperty('value')) {
                useBookStore.getState().setAtPath(path, val);
            } else {
                debugger;
                console.error('Тип результата не соответствует', val);
            }
        }
        return value;
    });

const deleteFields = (dataStruct: any, arrFields: string[], excludePath?: string) =>
    walkAndFilter(dataStruct, ({value, arrPath}) => {
        // Исключить путь
        if (excludePath && arrPath.join('.').includes(excludePath)) return value;

        arrFields.forEach((field: string) => {
            if (value?.hasOwnProperty(field)) delete value[field];
        });

        return value;
    });

const deleteEmpty = (dataStruct: any) =>
    walkAndFilter(dataStruct, ({key, value}) =>
        (key != 'target' && key != 'value') && isEmpty(value) ? null : value);

/**
 * Подготовка, убирает из верхних узлов все не заполненые с (value=='')
 * @param dataStruct
 */
const prepareStructureFirst = (dataStruct: any) => {

    const dataFilteredEmptyVal = walkAndFilter(dataStruct, ({parent, key, value}) => {

        if (value?.hasOwnProperty('value') && typeof value.value != "object" && !value?.options?.tags?.includes('incompressible'))
            return value.value; // Сжимаем объект в каждый узел подставляем значение value

        if (parent?.hasOwnProperty('value') && parent.value == '') return null;
        if (value?.hasOwnProperty('value') && value.value == '') return null;
        if (key != 'value' && isEmpty(value)) return null; // Убираем пустые узлы типа: {}

        return value;
    })

    const delFields = deleteFields(dataFilteredEmptyVal, [
        // 'options',
        'desc', 'example', 'requirements', 'variants']);

    let nodeCharacters = delFields?.['Персонажи'];

    if (Object.keys(nodeCharacters?.['Главный герой'] ?? []).length == 2) delete nodeCharacters['Главный герой'];
    if (Object.keys(nodeCharacters?.['Антагонист'] ?? []).length == 2) delete nodeCharacters['Антагонист'];

    if (isEmpty(nodeCharacters)) delete dataFilteredEmptyVal?.['Персонажи'];

    return dataFilteredEmptyVal;
}
const prepareStructureSecond = (dataStruct: any, arrDelFields: string[]) => {
    dataStruct = walkAndFilter(dataStruct, ({value}) => {
        if (value?.hasOwnProperty('value')) {
            const incompressible = value?.options?.tags?.includes('incompressible');
            delete value.requirements;
            delete value.example;
            if (!incompressible) return value.value; // Сжимаем объект в каждый узел подставляем значение value
        }
        return value;
    });
    dataStruct = deleteFields(dataStruct, arrDelFields);
    dataStruct = deleteEmpty(dataStruct);
    dataStruct = deleteEmpty(dataStruct);
    dataStruct = deleteEmpty(dataStruct);

    return dataStruct;
}

const GPTHeader = (props: CallbackParams) => {

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type, data}) => {
            if (type == 'gpt-progress-rewrite') {
                const numb = data.split('target').length - 1
                const prc = numb / total * 100;
                if (!Number.isFinite(prc)) return;
                eventBus.dispatchEvent('message-local', {type: 'progress', data: numb / total * 100})
            }
        });
    }, []);

    const handleTextGPT = useCallback(async (text: string, fnPrompt: {
        requirements: string,
        example?: string
    }, path: any[]) => {

        let source: {};
        let target = JSON.parse(JSON.stringify(text));

        const _value = target.value;
        const countWords = _value.split(' ').length; // Посчитаем слова

        target.example = fnPrompt?.example ?? '';
        target.value = '';
        useBookStore.getState().book;

        const COMMON_PATHS: string[][] = [
            ['Общие', 'Жанр'],
            ['Общие', 'Общее настроение'],
            ['Общие', 'Эпоха'],
            ['Общие', 'Возраст аудитории']
        ] as const;

        const [genre, mood, age, ageLimit] = extractCommonValues(COMMON_PATHS);

        let promptRequirements = template(fnPrompt?.requirements ?? '', null, {
            halfWords: Math.trunc(countWords * .5),
            x2Words: countWords * 2,
            genre,
            mood,
            age,
            ageLimit,
        });
        target.requirements = promptRequirements + ' ' + _value

        source = target;

        const listPathSrc = {};
        source = walkAndFilter(source, ({value, arrPath}) => {
            if (value?.hasOwnProperty('value') && !value.value && typeof value.value !== "object") {

                const id = generateUID();
                listPathSrc[id] = [...path, ...arrPath, 'value'];
                value.id = id;
                value.target = '';
                delete value.value;

                if (value?.hasOwnProperty('options')) { // Подстановка значений
                    const strValue = JSON.stringify(value);
                    const _strValue = template(strValue, null, {...value.options});
                    value = JSON.parse(_strValue);
                }

            }
            return value;
        });

        source = deleteFields(source, ['options']);
        total = Object.keys(listPathSrc).length;

        let resultStruct = await toGPT(promptWrite, {
            source: JSON.stringify(source, null, 2),
            path: path.join('.')
        });

        total = 0;
        eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})

        applyGPTResult(resultStruct, listPathSrc);

    }, []);

    const generateTextGPT = useCallback(async (llm: number) => {

        let tags = props.value?.options?.tags;
        const isScene = isEqualString(props.parent?.options?.tags, 'scene');
        const isObject = props.path.includes('Все объекты');//isEqualString(tags, 'object');
        const isArt = isEqualString(tags, 'art');
        const isEvent = isEqualString(tags, 'event');

        let book = useBookStore.getState().book;

        let source = JSON.parse(JSON.stringify(book));
        source = prepareStructureFirst(source);

        let target = JSON.parse(JSON.stringify(props.value));

        let numberValue = 0;
        walkAndFilter(target, ({value}) => {
            if (value?.hasOwnProperty('value')) numberValue++;
            return value;
        });

        if (numberValue == 1) target = walkAndFilter(target, ({value}) => {
            if (value?.hasOwnProperty('value')) value.value = '';
            return value;
        });

        source = deleteFields(source, ['Результат', 'Визуальный стиль изображений', isObject ? '' : 'Все объекты'],);
        source = deleteFields(source, ['Событие', 'Литературное описаное событие'], props.path.slice(0, -1).join('.'));

        source = deleteFields(source, ['Название кратко', 'Описание сцены', 'События', 'Сущности'], props.path.slice(0, -2).join('.'));

        const [obj, key] = getObjectByPath(source, props.path as string[], (obj, key, indexPath) => {
            debugger
            console.log(obj, key, indexPath)

        });
        obj[key] = target;
        if (isScene) obj[key].options.sceneName = props.path.at(-2); // для того что бы можно было подставить название текущей сцены

        const listPathSrc = {};
        source = walkAndFilter(source, ({value, parent, arrPath}) => {
            if (value?.hasOwnProperty('value') && !value.value && typeof value.value !== "object") {

                const id = generateUID();
                listPathSrc[id] = [...arrPath, 'value'];
                value.id = id;
                value.target = '';
                delete value.value;

                // Подстановка значений
                if (value?.hasOwnProperty('options') || parent?.hasOwnProperty('options')) {
                    const strValue = JSON.stringify(value);
                    let _strValue = template(strValue, null, {...value.options});
                    _strValue = template(_strValue, null, {...parent.options});
                    value = JSON.parse(_strValue);
                }
            }
            return value;
        });

        source = prepareStructureSecond(source, ['options']);
        total = Object.keys(listPathSrc).length;

        if (total > 0) {

            let resultStruct = await toGPT(
                promptWrite,
                {
                    source: JSON.stringify(source, null, 2),
                    path: '["' + props.path.join('"."') + '"]'
                }, llm);

            applyGPTResult(resultStruct, listPathSrc);
        }

        total = 0;
        eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})
    }, []);

    const {
        addEvil, addKindness, addNegative, addPositive, collapseText,
        expandText, inverseText, addActions, addImprove, humanize
    } = fnPromptTextHandling;

    const isValue = props.value?.hasOwnProperty('value') && typeof props.value.value !== "object";

    const ActionButton = useCallback(({icon, prompt}: {
        icon: React.ReactNode; prompt: any
    }) => <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                    onAction={() => handleTextGPT(props.value, prompt, props.path)}
                    title={prompt.desc}>
        {icon}
    </ButtonEx>, [])


    return <>
        <ButtonEx className={clsx('w-[24px] h-[24px] transition', CSS_BTN)}
                  onConfirm={() => generateTextGPT(0)} title="Генерация тип-1" description="Генерация тип-1">
            <BsStars size={14}/>
        </ButtonEx>
        {/*<ButtonEx className={clsx('w-[24px] h-[24px] hover:!bg-teal-500 hover:text-white transition', CSS_BTN)}*/}
        {/*          onConfirm={() => generateTextGPT(1)} title="Генерация простая +кэш"*/}
        {/*          description="Генерация простая +кэш">*/}
        {/*    <BsStars size={14}/>*/}
        {/*</ButtonEx>*/}
        <ButtonEx className={clsx('w-[24px] h-[24px] hover:!bg-gray-600 hover:text-white transition', CSS_BTN)}
                  onConfirm={() => generateTextGPT(2)} title="Генерация тип-2" description="Генерация тип-2">
            <GoStarFill size={14}/>
        </ButtonEx>
        {/*<ButtonEx className={clsx('w-[24px] h-[24px] hover:!bg-red-500 hover:text-white transition', CSS_BTN)}*/}
        {/*          onConfirm={() => generateTextGPT(3)} title="Генерация максимальная"*/}
        {/*          description="Генерация максимальная">*/}
        {/*    <BsStars size={14}/>*/}
        {/*</ButtonEx>*/}
        {isValue &&
            <DropdownButton
                title={<div className="w-[24px] content-center justify-items-center"><BsThreeDotsVertical size={14}/>
                </div>}
                className={'!w-[24px] h-[24px] px-1 ' + CSS_BTN}
                isChevron={false}>
                <div className={clsx(
                    'flex flex-col bg-white gap-0.5',
                    'outline-1 outline-gray-200 rounded-[5px] p-2'
                )}>
                    <ActionButton icon={<BsSun/>} prompt={addKindness}/>
                    <ActionButton icon={<BsCloudRain/>} prompt={addEvil}/>
                    <ActionButton icon={<BsEmojiSmile/>} prompt={addPositive}/>
                    <ActionButton icon={<BsEmojiFrown/>} prompt={addNegative}/>
                    <ActionButton icon={<BsArrowsFullscreen/>} prompt={expandText}/>
                    <ActionButton icon={<BsArrowsCollapse/>} prompt={collapseText}/>
                    <ActionButton icon={<BsCircleHalf/>} prompt={inverseText}/>
                    <ActionButton icon={<BsLightning/>} prompt={addActions}/>
                    <ActionButton icon={<BsCheckAll/>} prompt={addImprove}/>
                    <ActionButton icon={<ImMan/>} prompt={humanize}/>
                </div>
            </DropdownButton>}
    </>
};
export {GPTHeader};