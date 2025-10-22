// ~noinspection JSUnusedLocalSymbols
// ~@ts-nocheck
import {generateUID, getID, getObjectByPath, isEmpty, isEqualString, walkAndFilter} from "../../lib/utils.ts";
import {useBookStore, useImageStore} from "./store/storeBook.ts";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {CallbackParams, Clb, DefaultIcon} from "./BookTreeEditor.tsx";
import TextWrite from "../Auxiliary/TextWrite.tsx";
import ButtonEx from "../Auxiliary/ButtonEx.tsx";
import clsx from "clsx";
import {structPlotArc5, structPlotArc8, structPlotArcHero, structPlotArcTravelCase} from "./mapBook/structArcs.ts";
import {minorCharacter} from "./mapBook/structCharacters.ts";
import {structScene} from "./mapBook/structScene.ts";
import {Tooltip} from "../Auxiliary/Tooltip.tsx";
import {eventBus} from "../../lib/events.ts";
import {template} from "../../lib/strings.ts";
import {toGPT, toImageGenerate} from "./general.utils.ts";
import {fnPromptTextHandling, promptImageCharacter, promptWrite} from "./prompts.ts";
import DropdownButton from "../Auxiliary/DropdownButton.tsx";
import {LIST_KEY_NAME} from "./BookStory.tsx";

// @ts-ignore
window.q = useImageStore.getState;

const CONTROL_BTN = 'opacity-30 hover:opacity-100';
const SET_OPTIONS = 'options desc example requirements variants';
let total = 0;

const extractCommonValues = (arrPath: string[][]) =>
    arrPath.map((path: string[]) => {
        const [obj, key] = getObjectByPath(useBookStore.getState().book, [...path, 'value']);
        return obj[key];
    });

const pathHandler = (path: (string | number)[]) => {
    return path.join('.').toLocaleLowerCase().replaceAll(/[^a-zA-Zа-яА-Я.]/g, '-');
}

const applyGPTResult = (resultStruct: any, listPathSrc: {}) =>

    walkAndFilter(resultStruct, ({value}) => {
        if (value?.hasOwnProperty('id')) {
            const id = value.id;
            let val = value?.target?.replaceAll?.(/\n\n/g, '\n');
            if (typeof val != 'string') return value;

            const path = listPathSrc[id];
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

const deleteFields = (dataStruct: any, arrFields: string[]) =>
    walkAndFilter(dataStruct, ({value}) => {
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

        if (parent?.hasOwnProperty('value') && parent.value == '') return null;
        if (value?.hasOwnProperty('value') && value.value == '') return null;
        if (key != 'value' && isEmpty(value)) return null; // Убираем пустые узлы типа: {}
        if (value?.hasOwnProperty('value') && typeof value.value != "object" && !value?.options?.tags?.includes('incompressible'))
            return value.value; // Сжимаем объект в каждый узел подставляем значение value

        return value;
    })

    const delFields = deleteFields(dataFilteredEmptyVal, [
        // 'options',
        'desc', 'example', 'requirements', 'variants']);

    let nodeCharacters = delFields?.['Персонажи'];

    if (Object.keys(nodeCharacters?.['Главный герой']).length == 2) delete nodeCharacters['Главный герой'];
    if (Object.keys(nodeCharacters?.['Антогонист']).length == 2) delete nodeCharacters['Антогонист'];

    if (isEmpty(nodeCharacters)) delete dataFilteredEmptyVal?.['Персонажи'];

    return dataFilteredEmptyVal;
}
const prepareStructureSecond = (dataStruct: any) => {
    dataStruct = walkAndFilter(dataStruct, ({value}) => {
        if (value?.hasOwnProperty('value')) {
            const incompressible = value?.options?.tags?.includes('incompressible');
            delete value.requirements;
            delete value.example;
            // delete value.desc;
            if (!incompressible) return value.value; // Сжимаем объект в каждый узел подставляем значение value
        }
        return value;
    });
    dataStruct = deleteFields(dataStruct, ['options']);
    dataStruct = deleteEmpty(dataStruct);
    dataStruct = deleteEmpty(dataStruct);
    dataStruct = deleteEmpty(dataStruct);

    return dataStruct;
}

const InputNumberEditor = ({doInput, value, className = ''}) => {
    const [curVal, setCurVal] = useState(value);
    const [isFocus, setIsFocus] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = nodeRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            e.stopPropagation();
            e.preventDefault();

            if (isFocus) {
                setCurVal((val: number) => val + (e.deltaY > 0 ? -1 : 1));
            }
        };

        el.addEventListener('wheel', handleWheel, {passive: false});
        return () => el.removeEventListener('wheel', handleWheel);
    }, [isFocus]);


    return <div ref={nodeRef} className="flex flex-row">
        <input value={curVal}
               onChange={e => setCurVal(e.target.value)}
               onBlur={() => {
                   setIsFocus(false);
                   return doInput(+curVal);
               }}
               onFocus={() => setIsFocus(true)}
               onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                   if (e.key === "Enter") {
                       (e.target as HTMLInputElement).blur();
                       doInput(+curVal);
                   }
               }}
               className={'w-[1.5em] ' + className}
        />
    </div>;
};
const SceneHeader = (props: CallbackParams) => {
    const {path, value} = props;

    const sceneName = value?.['Название кратко']?.value;
    const sceneDesc = value?.['Название кратко']?.desc;

    const [_val, set_val] = useState<any>(sceneName);

    return <>
        <TextWrite
            className="text-black !w-auto"
            fitToTextSize={true}
            value={_val}
            onChange={(e) => set_val(e.target.value)}
            onBlur={() => useBookStore.getState().setAtPath(path.concat(['Название кратко', 'value']), _val)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    useBookStore.getState().setAtPath(path.concat(['Название кратко', 'value']), _val);
                    (e.target as HTMLInputElement).blur();
                }
            }}
            placeholder={sceneDesc}
        />
    </>
}
const MinorCharacterHeader = (props: CallbackParams) => {

    const characterName = (props.value)?.['Имя кратко']?.value;
    const characterDesc = (props.value)?.['Имя кратко']?.desc;

    const [_val, set_val] = useState<any>(characterName);


    return <>
        <TextWrite
            className="text-black !w-auto"
            fitToTextSize={true}
            value={_val}

            onChange={(e) => set_val(e.target.value)}
            onBlur={() => useBookStore.getState().setAtPath(props.path.concat(['Имя кратко', 'value']), _val)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    useBookStore.getState().setAtPath(props.path.concat(['Имя кратко', 'value']), _val);
                    (e.target as HTMLInputElement).blur();
                }
            }}

            placeholder={characterDesc}
        />
    </>;
};

const General = (props: CallbackParams) => {
    if ((props.path)[0] != 'Общие') return null;

    let isOptions = LIST_KEY_NAME[props.keyName];
    let name: string = isOptions ?? props.keyName;

    return <div className="text-nowrap">{name}</div>;
};
const Characters = (props: CallbackParams) => {

    if ((props.path)[0] != 'Персонажи') return null;

    let tags = props.value?.options?.tags;
    const isAllCharacters = isEqualString(tags, 'all-characters');
    const isCharacters = isEqualString(tags, 'character');
    const isMinorCharacters = isEqualString(tags, 'minor-characters');
    const isMinorCharacter = isEqualString(tags, 'minor-character');
    const isImageGen = isEqualString(tags, 'image-gen');

    let isOptions = LIST_KEY_NAME[props.keyName];
    let name: string = isOptions ?? props.keyName;

    if (!(isCharacters || isAllCharacters || isMinorCharacters || isMinorCharacter))
        return <div className="text-nowrap">{name}</div>;

    return <>
        {!isMinorCharacter && <div className="text-nowrap">{name}</div>}
        {isAllCharacters && <div className="flex 1flex-row gap-1">
            <ButtonEx className={clsx("bi-stack w-[24px] h-[24px] text-[11px]", CONTROL_BTN)} onClick={() => {
                let book = useBookStore.getState().book;
                let arr: string[] = props.value.value.split('\n');
                const arrExistCharacter1 = Object.entries(book['Персонажи']['Второстепенные персонажи']).filter(([key, _]) => key.toLocaleLowerCase().startsWith('перс')).map(([_, it]) => it["Имя полное"].value)
                const arrExistCharacter2 = Object.entries(book['Персонажи']['Второстепенные персонажи']).filter(([key, _]) => key.toLocaleLowerCase().startsWith('перс')).map(([_, it]) => it["Имя кратко"].value)
                const arrExistCharacter = [...arrExistCharacter1, ...arrExistCharacter2];

                if (Array.isArray(arr)) {
                    arr = arr.filter(characterDesc => {
                        const charDesc = characterDesc.toLocaleLowerCase();
                        const character = JSON.parse(JSON.stringify(minorCharacter));
                        character['Общее описание'].value = characterDesc;

                        if (charDesc.includes('главный герой')) {
                            console.log('1)' + charDesc);
                            if (book['Персонажи']['Главный герой']['Общее описание'].value) return;
                            useBookStore.getState().mergeAtPath(['Персонажи', 'Главный герой', 'Общее описание'], {value: character})
                        } else if (charDesc.includes('антогонист')) {
                            console.log('2)' + charDesc);
                            if (book['Персонажи']['Антогонист']['Общее описание'].value) return;
                            useBookStore.getState().mergeAtPath(['Персонажи', 'Антогонист', 'Общее описание'], {value: character})
                        } else {

                            const isExist = arrExistCharacter.some(simpleName => {
                                const arrNameIt = simpleName.toLocaleString().split(',').map((it: string) => it.toLocaleLowerCase().trim());
                                return arrNameIt.some((name: string) => {
                                    return charDesc.substring(0, charDesc.search(/\s.\s/)).includes(name);
                                })
                            })
                            if (isExist) return;

                            useBookStore.getState().mergeAtPath(['Персонажи', 'Второстепенные персонажи'], {['Персонаж-' + getID()]: character})
                        }
                    })
                    useBookStore.getState().mergeAtPath(['Персонажи', 'Все персонажи'], {value: arr.join('\n')});
                }
            }}/>
        </div>}
        { // Персонажи кнопка [+]
            isMinorCharacters && <>
                <ButtonEx className={clsx("bi-plus-circle w-[24px] h-[24px]", CONTROL_BTN)}
                          onClick={() => useBookStore.getState().mergeAtPath(props.path, {['Персонаж-' + getID()]: minorCharacter})}/>
            </>}
        {isMinorCharacter && <MinorCharacterHeader {...props}/>}
        {isImageGen && <ButtonEx className="bi-image w-[24px] h-[24px]" onAction={async () => {
            let book = useBookStore.getState().book;

            console.log(props.keyName)

            const arrPath = [
                [...props.path, 'Тело/физические характеристики'],
                [...props.path, 'Стиль и визуальные особенности']
            ]

            const arr = extractCommonValues(arrPath as string[][]);


            let styleGeneral = book?.['Общие']?.['Визуальный стиль изображений']?.value;
            let styleCharacter = book?.['Персонажи']?.['Визуальный стиль персонажей']?.value;

            const prompt = template(promptImageCharacter, {styleGeneral, styleCharacter, desc: arr.join('\n')});

            const res = await toImageGenerate({prompt});

            useImageStore.getState().addCharacters(props.keyName + '', res)

            console.log(res);
        }}/>}
    </>;
};
const PlotArc = (props: CallbackParams) => {

    if ((props.path)[0] != 'Сюжетная арка') return null;

    const tags = props.value?.options?.tags;
    const isSceneItem = tags?.includes('scene');
    const isPlotArc = tags?.includes('сюжетная-арка');
    const isPlotArcItem = tags?.includes('plot-arc-item');
    const isArcEventsItem = tags?.includes('arc-events');
    const isSceneHeader = tags?.includes('scene');

    let isOptions = LIST_KEY_NAME[props.keyName];
    let name: any = isOptions ?? props.keyName;
    if (isSceneItem) name = null; // Убираем имя заголовка для сцены

    if (!(isSceneItem || isPlotArc || isPlotArcItem || isArcEventsItem || isSceneHeader))
        return <div className="text-nowrap">{name}</div>;

    return <>
        <div className="text-nowrap">{name}</div>
        {/*чистим заголовок для сцены*/}
        {isPlotArc && // Сюжетная арка
            <div className="flex flex-row w-fit gap-1 [&>*]:ring-1 pl-1">
                <>{[[structPlotArc5, '5-Актов'], [structPlotArc8, '8-Актов'], [structPlotArcHero, 'Герой'], [structPlotArcTravelCase, 'Попаданец']]
                    .map(([plot, plotName], i) =>
                        <ButtonEx
                            key={i}
                            className={clsx(plotName == props.value?.options?.name && 'bg-gray-300', 'h-[19px]', CONTROL_BTN)}
                            description={"Изменить на " + plotName}
                            onConfirm={() => props.toWrite(plot)}
                            disabled={plotName == props.value?.options?.name}
                        >
                            {plotName as string}
                        </ButtonEx>)}</>
            </div>
        }
        {isPlotArcItem &&
            // Сцены кнопка [+]
            <ButtonEx className={clsx("bi-plus-circle w-[24px] h-[24px]", CONTROL_BTN)}
                      onClick={() => useBookStore.getState().mergeAtPath(props.path, {['Сцена-' + getID()]: structScene})}/>
        }
        {isPlotArcItem && <div className="flex flex-row gap-1">
            <Tooltip text={"Количество сцен"} direction={"right"} className={clsx(
                'text-gray-500', CONTROL_BTN)}>
                <InputNumberEditor
                    className={"text-center"}
                    value={props.value.options.quantScene}
                    doInput={(val: number) => {
                        if (isNaN(val)) val = 3;
                        props.toWrite(val, [...(props.path), 'options', 'quantScene']);
                    }}
                />
            </Tooltip>
            <ButtonEx className={clsx("bi-stack text-[11px]", CONTROL_BTN)} onClick={() => {
                const arr = props.value.value.split('\n')
                if (Array.isArray(arr)) {
                    arr.forEach(item => {
                        let _structScene = JSON.parse(JSON.stringify(structScene));
                        _structScene['Описание сцены'].value = item;
                        const nameScene = 'Сцена-' + getID();
                        useBookStore.getState().mergeAtPath(props.path, {[nameScene]: _structScene});
                        useBookStore.getState().toggleCollapse([...(props.path), nameScene]);
                        useBookStore.getState().toggleCollapse([...(props.path), nameScene, '']);
                    })
                }
            }}/>
        </div>}
        {isArcEventsItem && <div className="flex flex-row gap-1">
            <Tooltip text={"Количество событий на сцене"} direction={"right"} className={clsx(
                'text-gray-500', CONTROL_BTN)}>
                <InputNumberEditor
                    className={"text-center"}
                    value={props.value.options.quantEvents}
                    doInput={(val: number) => {
                        if (isNaN(val)) val = 3;
                        props.toWrite(val, [...(props.path), 'options', 'quantEvents']);
                    }}
                />
            </Tooltip>
        </div>}
        {isSceneHeader && <SceneHeader {...props}/>}
    </>;
};

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

        let promptRequirements = template(fnPrompt?.requirements ?? '', {
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
                    const _strValue = template(strValue, {...value.options});
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

    const generateTextGPT = useCallback(async () => {

        let json = useBookStore.getState().book;
        let source = JSON.parse(JSON.stringify(json));
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

        const [obj, key] = getObjectByPath(source, props.path as string[]);
        obj[key] = target;

        const listPathSrc = {};
        source = walkAndFilter(source, ({value, arrPath}) => {
            if (value?.hasOwnProperty('value') && !value.value && typeof value.value !== "object") {

                const id = generateUID();
                listPathSrc[id] = [...arrPath, 'value'];
                value.id = id;
                value.target = '';
                delete value.value;

                if (value?.hasOwnProperty('options')) { // Подстановка значений
                    const strValue = JSON.stringify(value);
                    const _strValue = template(strValue, {...value.options});
                    value = JSON.parse(_strValue);
                }

            }
            return value;
        });

        source = prepareStructureSecond(source);

        total = Object.keys(listPathSrc).length;

        let resultStruct = await toGPT(
            promptWrite,
            {
                source: JSON.stringify(source, null, 2),
                path: '["' + props.path.join('"."') + '"]'
            });

        total = 0;
        eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})

        applyGPTResult(resultStruct, listPathSrc);

    }, []);

    const {
        addEvil, addKindness, addNegative, addPositive, collapseText, expandText, inverseText, addActions, addImprove
    } = fnPromptTextHandling;

    const isValue = props.value?.hasOwnProperty('value') && typeof props.value.value !== "object";

    return <>
        <ButtonEx className={clsx('bi-stars w-[24px] h-[24px]', CONTROL_BTN)}
                  onConfirm={() => generateTextGPT()} title="Генерация" description="Генерация"/>
        {isValue &&
            <DropdownButton title={<div className="bi-three-dots-vertical"/>} className={'px-1 ' + CONTROL_BTN}
                            isChevron={false}>
                <div className={clsx(
                    'flex flex-col bg-white gap-0.5',
                    'outline-1 outline-gray-200 rounded-[5px] p-2'
                )}>
                    <ButtonEx className={clsx('bi-sun w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addKindness, props.path)}
                              title={addKindness.desc}/>
                    <ButtonEx className={clsx('bi-cloud-rain w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addEvil, props.path)} title={addEvil.desc}/>
                    <ButtonEx className={clsx('bi-emoji-smile w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addPositive, props.path)}
                              title={addPositive.desc}/>
                    <ButtonEx className={clsx('bi-emoji-frown w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addNegative, props.path)}
                              title={addNegative.desc}/>
                    <ButtonEx className={clsx('bi-arrows-fullscreen w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, expandText, props.path)}
                              title={expandText.desc}/>
                    <ButtonEx className={clsx('bi-arrows-collapse-vertical w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, collapseText, props.path)}
                              title={collapseText.desc}/>
                    <ButtonEx className={clsx('bi-circle-half w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, inverseText, props.path)}
                              title={inverseText.desc}/>
                    <ButtonEx className={clsx('bi-lightning w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addActions, props.path)}
                              title={addActions.desc}/>
                    <ButtonEx className={clsx('bi-check-all w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addImprove, props.path)}
                              title={addImprove.desc}/>
                </div>
            </DropdownButton>}
    </>
};

export const clbHeader: Clb = (props: CallbackParams) => {
    const arrSize = [14, 14, 14];

    const options = props.value?.options;
    const isToggle = !options?.excludes?.includes('toggle') && Object.keys(props.value).filter(it => !SET_OPTIONS.includes(it)).length > 0;

    let isOptions = LIST_KEY_NAME[props.keyName];

    return <div
        className={clsx('flex items-center gap-0.5 transition-all duration-700 hover:shadow-[inset_0_-1px_1px_rgba(0,0,0,0.05)]')}
        style={{fontSize: arrSize?.[props.deep] ?? 14 + 'px'}}
        onMouseDown={(e) => {
            if (e.button != 1) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.button == 1) (async () => await navigator.clipboard.writeText(pathHandler(props.path)))();
        }}
    >
        {isToggle &&
            <ButtonEx onClick={() => props.toSwitch()} className="p-1 rounded hover:bg-gray-100">
                <DefaultIcon collapse={props.collapsed}/>
            </ButtonEx>
        }
        <General {...props}/>
        <Characters {...props}/>
        <PlotArc {...props}/>

        {!isOptions && <GPTHeader {...props}/>}
        {!isOptions && <div className="flex flex-row flex-1 justify-end">
            <ButtonEx // Кнопка очистить поля
                className={clsx("bi-eraser-fill w-[24px] h-[24px] hover:!bg-sky-600 hover:text-white transition", CONTROL_BTN)}
                description="Очистить"
                onConfirm={() => walkAndFilter(props.value, ({key, value, arrPath}) => {
                    key == 'value' && useBookStore.getState().setAtPath(props.path.concat(arrPath), '');
                    return value;
                })}/>
            {options?.tags?.includes('deletable') && <ButtonEx
                className={
                    clsx("bi-x-lg w-[24px] h-[24px] hover:!bg-red-700 hover:text-white transition", CONTROL_BTN)
                }
                description="Удалить"
                onConfirm={() => useBookStore.getState().removeAtPath(props.path)}/>}
            {(props.value?.desc || props.value?.examples || props.value?.requirements) && <ButtonEx className={clsx(
                props.value?.options?.forcedIncludes ? 'bi-gear-fill' : 'bi-gear',
                'w-[24px] h-[24px]',
                CONTROL_BTN,
            )} onClick={() => {
                const _path = [...(props.path), 'options', 'forcedIncludes'];
                useBookStore.getState().setAtPath(_path, props.value?.options?.forcedIncludes ? '' : SET_OPTIONS);
            }}/>}
        </div>}
    </div>
}