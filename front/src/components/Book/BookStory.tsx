import React, {useCallback, useEffect, useState} from "react";
import JSONTreeEditor, {CallbackParams, Clb, DefaultIcon, useJsonStore} from "./JSONTreeEditor";
import {structPlot} from "./mapBook/structPlot.ts";
import {useShallow} from "zustand/react/shallow";
import TextWrite from "../Auxiliary/TextWrite.tsx";
import ButtonEx from "../Auxiliary/ButtonEx.tsx";
import clsx from "clsx";
import {generateUID, getID, getObjectByPath, isEmpty, walkAndFilter} from "../../lib/utils.ts";
import {toGPT} from "./general.utils.ts";
import {fnPromptTextHandling, promptWrite} from "./prompts.ts";
import {eventBus} from "../../lib/events.ts";
import {template} from "../../lib/strings.ts";
import {structPlotArc5, structPlotArc8, structPlotArcHero, structPlotArcTravelCase} from "./mapBook/structArcs.ts";
import {Tooltip} from "../Auxiliary/Tooltip.tsx";
import {minorCharacter} from "./mapBook/structCharacters.ts";
import {structScene} from "./mapBook/structScene.ts";
import DropdownButton from "../Auxiliary/DropdownButton.tsx";

const CONTROL_BTN = 'opacity-30 hover:opacity-100';
const SET_OPTIONS = 'options desc example requirements variants';
const LIST_KEY_NAME = {desc: 'Описание', example: 'Пример', requirements: 'Требования', variants: 'Варианты'};

// forced update browse
if (+localStorage.getItem('___refresh') < Date.now()) {
    localStorage.setItem('___refresh', String(Date.now() + 3000));
    window.location.reload();
}

const TextEditor = ({toWrite, value, parent, className = ''}) => {
    const [curVal, setCurVal] = useState(value);
    return <TextWrite value={curVal}
                      placeholder={parent?.desc}
                      onChange={e => setCurVal(e.target.value)}
                      onBlur={() => toWrite(curVal)} fitToTextSize={true}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter" && e.ctrlKey) {
                              toWrite(curVal);
                              (e.target as HTMLInputElement).blur();
                              // console.log(parent);
                          }
                      }}
                      className={className}
    />;
};

const InputEditor = ({doInput, value, className = ''}) => {
    const [curVal, setCurVal] = useState(value);

    return <div className="flex flex-row">
        <input value={curVal}
               onChange={e => setCurVal(e.target.value)}
               onBlur={() => doInput(+curVal)}
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

const pathHandler = (path: (string | number)[]) => {
    return path.join('.').toLocaleLowerCase().replaceAll(/[^a-zA-Zа-яА-Я.]/g, '-');
}

const isNode = (path: string, name: string) => path.endsWith(name);
const isChildOf = (path: string, name: string) => path.startsWith(name + '.');

//eslint-disable-next-line
const isImmediateChildren = (path: string, name: string) => {
    const len = (name + '.').length;
    if (path.startsWith(name + '.')) {
        return !path.substring(len).includes('.');
    }
};

const deleteFields = (dataStruct: any, arrFields) => {
    return walkAndFilter(dataStruct, ({value}) => {
        arrFields.forEach((field: string) => {
            if (value?.hasOwnProperty(field)) delete value[field];
        });
        return value;
    })
}
/**
 * Подготовка, убирает из верхних узлов все не заполненые с (value=='')
 * @param dataStruct
 */
const prepareStructure = (dataStruct: any) => {


    const dataFilteredEmptyVal = walkAndFilter(dataStruct, ({parent, key, value, hasChild, arrPath}) => {

        if (parent?.hasOwnProperty('value') && parent.value == '') return null;
        if (value?.hasOwnProperty('value') && value.value == '') return null;
        if (key != 'value' && isEmpty(value)) return null; // Убираем пустые узлы типа: {}
        if (value?.hasOwnProperty('value') && typeof value.value != "object" && !value?.options?.tags?.includes('incompressible'))
            return value.value; // Сжимаем объект в каждый узел подставляем значение value

        return value;
    })

    const delFields = deleteFields(dataFilteredEmptyVal, ['options', 'desc', 'example', 'requirements', 'variants']);

    let nodeCharacters = delFields?.['Персонажи'];

    if (Object.keys(nodeCharacters?.['Главный герой']).length == 2) delete nodeCharacters['Главный герой'];
    if (Object.keys(nodeCharacters?.['Антогонист']).length == 2) delete nodeCharacters['Антогонист'];

    // const arrSecondaryChar = Object.entries(nodeCharacters?.['Второстепенные песонажи']) // => в массив
    // const arrFields = ['desc', 'example', 'requirements'];
    // const numberOfCharacters = arrSecondaryChar.length - arrFields.length;
    // const arrSkip = arrSecondaryChar
    //     .filter(([key, _]) => !arrFields.includes(key)) // отбрасываем ненужные
    //     .filter(([_, val]) => Object.keys(val).length == 0) // оставляем только пустые
    //     .map(([key, _]) => key) // мапим только значения

    // if (arrSkip) {
    //     if (numberOfCharacters == arrSkip.length) {
    //         delete nodeCharacters?.['Второстепенные песонажи']
    //     } else {
    //         arrSkip.forEach(key => delete nodeCharacters?.['Второстепенные песонажи'][key]) // чистим пустые
    //     }
    // }

    if (isEmpty(nodeCharacters)) delete dataFilteredEmptyVal?.['Персонажи'];

    // let res = walkAndFilter(dataFilteredEmptyVal, ({parent, key, value, hasChild, arrPath}) => {
    //     if (isEmpty(value)) return null; // Убираем пустые узлы типа: {}
    //     return value;
    // })
    // res = walkAndFilter(res, ({parent, key, value, hasChild, arrPath}) => {
    //     if (isEmpty(value)) return null; // Убираем пустые узлы типа: {}
    //     return value;
    // })

    return dataFilteredEmptyVal;
}

const SceneHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    const sceneName = value?.['Основные']?.['Название кратко']?.value;
    const sceneDesc = value?.['Основные']?.['Название кратко']?.desc;

    const [_val, set_val] = useState<any>(sceneName);


    return <>
        <TextWrite
            className="text-black !w-auto"
            fitToTextSize={true}
            value={_val}

            onChange={(e) => set_val(e.target.value)}
            onBlur={() => useJsonStore.getState().setAtPath(path.concat(['Основные', 'Название кратко', 'value']), _val)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    useJsonStore.getState().setAtPath(path.concat(['Основные', 'Название кратко', 'value']), _val);
                    (e.target as HTMLInputElement).blur();
                }
            }}

            placeholder={sceneDesc}
        />
        <ButtonEx className={clsx(
            "bi-x-lg w-[24px] h-[24px] hover:!bg-red-700 hover:text-white transition",
            CONTROL_BTN
        )}
                  description="Удалить"
                  onConfirm={() => {
                      useJsonStore.getState().removeAtPath(path);
                      // @ts-ignore
                      eventBus.dispatchEvent('set-scroll-top', useJsonStore.getState().temp?.scrollTop);
                  }}/>
    </>;
};
const CharacterHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    const characterName = value?.['Основные']?.['Имя кратко']?.value;
    const characterDesc = value?.['Основные']?.['Имя кратко']?.desc;

    const [_val, set_val] = useState<any>(characterName);


    return <>
        <TextWrite
            className="text-black !w-auto"
            fitToTextSize={true}
            value={_val}

            onChange={(e) => set_val(e.target.value)}
            onBlur={() => useJsonStore.getState().setAtPath(path.concat(['Основные', 'Имя кратко', 'value']), _val)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    useJsonStore.getState().setAtPath(path.concat(['Основные', 'Имя кратко', 'value']), _val);
                    (e.target as HTMLInputElement).blur();
                }
            }}

            placeholder={characterDesc}
        />
        <ButtonEx className={clsx(
            "bi-x-lg w-[24px] h-[24px] hover:!bg-red-700 hover:text-white transition",
            CONTROL_BTN
        )}
                  description="Удалить"
                  onConfirm={() => useJsonStore.getState().removeAtPath(path)}/>
    </>;
};
const DefaultHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    const strPath = pathHandler(path);
    const isCharacterParent = isNode(strPath, 'персонажи.второстепенные-песонажи');
    const isScenes = isChildOf(strPath, 'сюжетная-арка') && deep == 2;
    const isSceneItem = isChildOf(strPath, 'сюжетная-арка') && deep == 3;
    const isPlotArc = isNode(strPath, 'сюжетная-арка')
    const isPlotArcItem = value?.options?.tags?.includes('plot-arc');

    let isOptions = LIST_KEY_NAME[keyName];
    let name: any = isOptions ?? keyName;
    if (isSceneItem) name = null; // Убираем имя заголовка для сцены

    return <>
        <div className="text-nowrap">{name}</div>
        {/*чистим заголовок для сцены*/}
        {isPlotArc && // Сюжетная арка
            <div className="flex flex-row w-fit gap-1 [&>*]:ring-1 pl-1">
                <>{[[structPlotArc5, '5-Актов'], [structPlotArc8, '8-Актов'], [structPlotArcHero, 'Герой'], [structPlotArcTravelCase, 'Попаданец']]
                    .map(([plot, plotName], i) =>
                        <ButtonEx
                            key={i}
                            className={clsx(plotName == value?.options?.name && 'bg-gray-300', 'h-[19px]', CONTROL_BTN)}
                            description={"Изменить на " + plotName}
                            onConfirm={() => props.toWrite(plot)}
                            disabled={plotName == value?.options?.name}
                        >
                            {plotName as string}
                        </ButtonEx>)}</>
            </div>
        }
        {isCharacterParent && // Персонажи кнопка [+]
            <ButtonEx className={clsx("bi-plus-circle w-[24px] h-[24px]", CONTROL_BTN)}
                      onClick={() => useJsonStore.getState().mergeAtPath(path, {['Персонаж-' + getID()]: minorCharacter})}/>
        }
        {isScenes && // Сцены кнопка [+]
            <ButtonEx className={clsx("bi-plus-circle w-[24px] h-[24px]", CONTROL_BTN)}
                      onClick={() => useJsonStore.getState().mergeAtPath(path, {['Сцена-' + getID()]: structScene})}/>
        }
        {isPlotArcItem && <div className="flex flex-row gap-1">
            <Tooltip text={"Количество сцен"} direction={"right"} className={clsx(
                'text-gray-500', CONTROL_BTN)}>
                <InputEditor
                    className={"text-center"}
                    value={value.options.quantScene}
                    doInput={(val: number) => {
                        if (isNaN(val)) val = 3;
                        toWrite(val, [...path, 'options', 'quantScene']);
                    }}
                />
            </Tooltip>
            <ButtonEx className={clsx("bi-stack text-[11px]", CONTROL_BTN)} onClick={() => {
                const arr = value.value.split('\n')
                if (Array.isArray(arr)) {
                    arr.forEach(item => {
                        let _structScene = JSON.parse(JSON.stringify(structScene));
                        _structScene['Описание сцены'].value = item;
                        useJsonStore.getState().mergeAtPath(path, {['Сцена-' + getID()]: _structScene})
                    })
                }
            }}/>
        </div>}
    </>;
};
const GPTHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    const [total, setTotal] = useState(0);

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type, data}) => {
            if (type == 'gpt-progress-rewrite') {
                const numb = data.split('value').length - 1
                const prc = numb / total * 100;
                if (!Number.isFinite(prc)) return;
                eventBus.dispatchEvent('message-local', {type: 'progress', data: numb / total * 100})
            }
        });
    }, []);

    const handleTextGPT = useCallback(async (
        text: string,
        fnPrompt: { requirements: string, example?: string },
        path: any[],
        toWrite: { (value: any, p?: any[]): void }) => {

        let source = {};
        let target = JSON.parse(JSON.stringify(text));

        const _value = target.value;
        const countWords = _value.split(' ').length; // Посчитаем слова

        target.example = fnPrompt?.example ?? '';
        target.value = '';

        let promptRequirements = template(
            fnPrompt?.requirements ?? '',
            {
                halfWords: Math.trunc(countWords * .5),
                x2Words: countWords * 2,
            });
        target.requirements = promptRequirements + ' ' + _value

        source = target;

        const listPathSrc = {};
        source = walkAndFilter(source, ({parent, key, value, hasChild, arrPath}) => {
            if (value?.hasOwnProperty('value') && !value.value && typeof value.value !== "object") {

                const id = generateUID();
                listPathSrc[id] = [...path, ...arrPath, 'value'];
                value.id = id;

                if (value?.hasOwnProperty('options')) { // Подстановка значений
                    const strValue = JSON.stringify(value);
                    const _strValue = template(strValue, {...value.options});
                    value = JSON.parse(_strValue);
                }

            }
            return value;
        });

        source = deleteFields(source, ['options']);
        setTotal(Object.keys(listPathSrc).length);

        let resultStruct = await toGPT({prompt: promptWrite, source, path: path.join('.')});

        setTotal(0);
        eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})

        walkAndFilter(resultStruct, ({parent, key, value, hasChild, arrPath}) => {
            if (value?.hasOwnProperty('id')) {
                const id = value.id;
                let val = value.value.replaceAll(/\n\n/g, '\n');
                const path = listPathSrc[id];
                if (typeof val == 'string')
                    toWrite(val, path)
                else
                    console.error('Тип результата не соответствует', val);
            }
            return value;
        });

    }, []);

    const generateTextGPT = useCallback(async () => {

        let source = JSON.parse(JSON.stringify(useJsonStore.getState().json));
        source = prepareStructure(source);

        let target = JSON.parse(JSON.stringify(value));

        const [obj, key] = getObjectByPath(source, path as string[]);
        obj[key] = target;

        const listPathSrc = {};
        source = walkAndFilter(source, ({parent, key, value, hasChild, arrPath}) => {
            if (value?.hasOwnProperty('value') && !value.value && typeof value.value !== "object") {

                const id = generateUID();
                listPathSrc[id] = [...arrPath, 'value'];
                value.id = id;

                if (value?.hasOwnProperty('options')) { // Подстановка значений
                    const strValue = JSON.stringify(value);
                    const _strValue = template(strValue, {...value.options});
                    value = JSON.parse(_strValue);
                }

            }
            return value;
        });

        source = deleteFields(source, ['options']);
        setTotal(Object.keys(listPathSrc).length);

        source.uid = Date.now();
        let resultStruct = await toGPT({prompt: promptWrite, source, path: path.join('.')});

        setTotal(0);
        eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})

        walkAndFilter(resultStruct, ({parent, key, value, hasChild, arrPath}) => {
            if (value?.hasOwnProperty('id')) {
                const id = value.id;
                let val = value.value.replaceAll(/\n\n/g, '\n');
                const path = listPathSrc[id];
                if (typeof val == 'string')
                    toWrite(val, path)
                else
                    console.error('Тип результата не соответствует', val);

            }
            return value;
        });

    }, []);

    const {
        addEvil, addKindness, addNegative, addPositive, collapseText, expandText, inverseText
    } = fnPromptTextHandling;

    return <>
        <DropdownButton title={<div className="bi-star"/>} className={'px-1 ' + CONTROL_BTN} isChevron={false}>
            <div className={clsx(
                'flex flex-col bg-white gap-0.5',
                'outline-1 outline-gray-200 rounded-[5px] p-2'
            )}>
                <ButtonEx className={clsx('bi-stars w-[24px] h-[24px]')} onAction={() => generateTextGPT()}/>
                <ButtonEx className={clsx('bi-sun w-[24px] h-[24px]')}
                          onAction={() => handleTextGPT(value, addKindness, path, toWrite)}/>
                <ButtonEx className={clsx('bi-cloud-rain w-[24px] h-[24px]')}
                          onAction={() => handleTextGPT(value, addEvil, path, toWrite)}/>
                <ButtonEx className={clsx('bi-emoji-smile w-[24px] h-[24px]')}
                          onAction={() => handleTextGPT(value, addPositive, path, toWrite)}/>
                <ButtonEx className={clsx('bi-emoji-frown w-[24px] h-[24px]')}
                          onAction={() => handleTextGPT(value, addNegative, path, toWrite)}/>
                <ButtonEx className={clsx('bi-arrows-fullscreen w-[24px] h-[24px]')}
                          onAction={() => handleTextGPT(value, expandText, path, toWrite)}/>
                <ButtonEx className={clsx('bi-arrows-collapse-vertical w-[24px] h-[24px]')}
                          onAction={() => handleTextGPT(value, collapseText, path, toWrite)}/>
                <ButtonEx className={clsx('bi-circle-half w-[24px] h-[24px]')}
                          onAction={() => handleTextGPT(value, inverseText, path, toWrite)}/>
            </div>
        </DropdownButton>
    </>
};

export const StoryEditor: React.FC = () => {

    const {change, reset, json, toggleCollapse} = useJsonStore(useShallow((s) => ({
        change: s.setAtPath,
        reset: s.reset,
        json: s.json,
        toggleCollapse: s.toggleCollapse,
    })));

    const clbEditorValue: Clb = (props) => {
        const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;
        const key = LIST_KEY_NAME[keyName];
        const isOptionsShowed = parent?.options?.forcedIncludes
        if (key) {
            return <div>
                {key}
                <TextEditor {...props}/>
            </div>
        }
        if (Array.isArray(parent)) {
            return <div>
                <TextEditor {...props}/>
            </div>
        }
        return <TextEditor {...props} className={clsx(
            isOptionsShowed && 'pointer-events-none opacity-50'
        )}/>
    }

    const clbHeader: Clb = (props) => {

        const {
            children, header, parent, toWrite,

            collapsed, deep, keyName, path, toSwitch, value,
        } = props;
        const arrSize = [14, 14, 14];

        const strPath = pathHandler(path);

        const options = value?.options;

        const isToggle = !options?.excludes?.includes('toggle') && Object.keys(value).filter(it => !SET_OPTIONS.includes(it)).length > 0;

        const isCharacterHeader = (isChildOf(strPath, 'персонажи.второстепенные-песонажи') && options?.tags == 'character');
        const isSceneHeader = (isChildOf(strPath, 'сюжетная-арка') && options?.tags == 'scene');
        const isDefaultHeader = !isCharacterHeader;

        let isOptions = LIST_KEY_NAME[keyName];

        return <div className={clsx('flex items-center gap-0.5')}
                    style={{fontSize: arrSize?.[deep] ?? 14 + 'px'}}
                    onMouseDown={(e) => {
                        if (e.button != 1) return;
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.button == 1) (async () => await navigator.clipboard.writeText(pathHandler(path)))();
                    }}
        >
            {isToggle &&
                <ButtonEx onClick={() => toSwitch()} className="p-1 rounded hover:bg-gray-100">
                    <DefaultIcon collapse={collapsed}/>
                </ButtonEx>
            }
            {isCharacterHeader && <CharacterHeader {...props}/>}
            {isSceneHeader && <SceneHeader {...props}/>}
            {isDefaultHeader && <DefaultHeader {...props}/>}

            {!isOptions && <GPTHeader {...props}/>}
            <DropdownButton title={<div className="bi-three-dots-vertical"/>} className={CONTROL_BTN} isChevron={false}
            >
                <div className={clsx(
                    'flex flex-col bg-white gap-0.5',
                    'outline-1 outline-gray-200 rounded-[5px] p-2'
                )}>
                    {!isOptions && <ButtonEx // Кнопка очистить поля
                        className={clsx("bi-eraser-fill w-[24px] h-[24px] hover:!bg-sky-600 hover:text-white transition", CONTROL_BTN)}
                        description="Очистить"
                        onConfirm={() => walkAndFilter(value, ({key, value, arrPath}) => {
                            key == 'value' && useJsonStore.getState().setAtPath(path.concat(arrPath), '');
                            return value;
                        })}/>
                    }
                </div>
            </DropdownButton>
            {!isOptions && <div className="justify-items-end flex-1">
                <ButtonEx className={clsx(
                    value?.options?.forcedIncludes ? 'bi-gear-fill' : 'bi-gear',
                    'w-[24px] h-[24px]',
                    CONTROL_BTN,
                )} onClick={() => {
                    const _path = [...path, 'options', 'forcedIncludes'];
                    change(_path, value?.options?.forcedIncludes ? '' : SET_OPTIONS);
                }}/>
            </div>}
            {/*<ButtonEx className="bi-x-lg w-[24px] h-[24px]" description="Удалить" onConfirm={() => remove(path)}/>*/}
        </div>
    }

    const clbContainer: Clb = (props) => {

        const {children, collapsed, deep, header, keyName, parent, path, toWrite, value} = props;
        const isWrap: boolean = Boolean(value?.options?.width);
        const width: string = parent?.options?.width;

        const strPath = pathHandler(path);

        if (deep == 0) {
            return <div className="">
                {children}
            </div>
        }

        if (isWrap) {
            return <>
                {header}
                <div className="flex flex-row flex-wrap pl-2 border-l ml-2">
                    {children}
                </div>
            </>
        }

        if (width) {
            return <div className="-outline-offset-3 outline-1 outline-gray-200 rounded-[5px] px-2 pt-1 pb-0.5"
                        style={{width}}>
                {header}{children}
            </div>
        }


        return <div className={clsx(LIST_KEY_NAME[keyName] && 'mb-1')}>
            {header}
            <div className={clsx(
                "pl-2 border-l ml-2"
            )}>
                {children}
            </div>
        </div>

        // return null;
    };

    return (
        <div className="p-4">

            <div className="mb-3 flex gap-2">
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => reset()}
                >
                    Reset store
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                        const arr = [

                            [
                                [
                                    "Общие",
                                    "Основные",
                                    "Название",
                                    "value"
                                ],
                                "Город в облаках"
                            ],
                            [
                                [
                                    "Общие",
                                    "Основные",
                                    "Жанр",
                                    "value"
                                ],
                                "Приключения, путешествия, детектив"
                            ],
                            [
                                [
                                    "Общие",
                                    "Основные",
                                    "Общее настроение",
                                    "value"
                                ],
                                "Авантюрное, веселое"
                            ],
                            [
                                [
                                    "Общие",
                                    "Основные",
                                    "Эпоха",
                                    "value"
                                ],
                                "20 век 30е годы"
                            ],
                            [
                                [
                                    "Общие",
                                    "Основные",
                                    "Возраст аудитории",
                                    "value"
                                ],
                                "Для всех, от детей до взрослых"
                            ],
                            [
                                [
                                    "Общие",
                                    "Основные",
                                    "Ключевые вопросы",
                                    "value"
                                ],
                                "Дружба, веверность, следование целям, способность пожертвовать собой ради других"
                            ],
                            [
                                [
                                    "Общие",
                                    "Основные",
                                    "Основные противоречия",
                                    "value"
                                ],
                                "Преодаление трудностей на пути к заветной цели, борьба с врагом в лице главного злодя, помощь и спасение нуждающихся"
                            ],
                            [
                                [
                                    "Общие",
                                    "Основные",
                                    "Образы символы",
                                    "value"
                                ],
                                "Путешествие как метафора личного роста и преодоления; дороги и тропы как выбор пути героя; погоня как символ стремления к цели и отчаянного бегства."
                            ]

                            // [
                            //     ["Общие", "Основные", "Общее настроение", "value"],
                            //     "драматический"
                            // ],
                            // [
                            //     ["Общие", "Сюжет кратко", "Экспозиция", "value"],
                            //     "Ветеран афганской войны, Сергей Князев, вернулся домой. Шел 1989 год — поздний ссср. Жизнь его идет на перекосяк, в стране разруха и расцветает бандитизм. Родители умерли и оставив Сергею квартиру, но бандиты ловко подделав документы, переписали квартиру на подставное лицо, Так Сергей оказывается на улице. Не долгие скитания по подъздам, приводят его на старый заброшенный склад, где он в скоре \"встревает\" в бандитские разборки."
                            // ],
                            // [
                            //     ["Общие", "Сюжет кратко", "Завязка", "value"],
                            //     "Негодяи истезают молодую девушку, требуя отдать долги её покойного мужа. Сергей не выдерживает и пытается востановить справедливость, (ведь он и сам пострадал от бандитского произвола). Но видмо судьба и в этот раз отворачивается от него и Сергея убивают. \nРазум и душа Сергея перемещаются в магический мир стредневековья, в тело молодого воришки, который только что стащил древний магический артефакт, но владелец артефакта настиг воришку и ударил заклятьем. Заклятьем, которое попав в украденый артефакт разрушило его и попутно прикончило незадачливого воришку, освободив тело для Сергея и давая ему второй шанс. Сергей после перемещения не сразу приходит в себя, но после обнаруживает у себя магические способности (позже по сюжету выяснится, что это произошло из-за того, что в момент смерти, магический удар попал по артефакту и странным образом магические сопосбности артефакта передались Сергею в новом теле)"
                            // ],
                            // [
                            //     ["Общие", "Сюжет кратко", "Развитие действия", "value"],
                            //     "Очнувшись в незнакомом теле, Сергей постепенно осознает произошедшее. Он понимает, что находится в другом мире, где магия – реальность, а его новое тело обладает скрытым потенциалом. Первые дни он пытается выжить в трущобах города, используя воровские навыки своего предшественника. Параллельно он изучает свои новые способности, которые упешно использует врешении постоянно возникающих проблем. \nВскоре Сергей случайно переходит дорогу могущественным силам, которые решают покончить с ним. Ему приходится выбирать между тем, чтобы скрываться и выживать в одиночку, или же принять свою новую судьбу и попытаться разобраться в происходящем, попутно раскрывая тайны своего прошлого и артефакта, который изменил его жизнь. На пути ему встречаются как враги, так и союзники, каждый из которых преследует свои цели. Бандиты, магические кланы, инквизиторы и простолюдины - все они оказываются втянуты в паутину интриг, центром которой становится Сергей."
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Имя кратко", "value"],
                            //     "Князь"
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Имя полное", "value"],
                            //     "Сергей Князев, Серёга, Князь, Князь-младший"
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Возраст", "value"],
                            //     "Около 30 лет (в мире средневековья - 20 лет)"
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Цели", "value"],
                            //     "Выжить в новом мире, разобраться в произошедшем, обрести справедливость"
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Жизненная ситуация", "value"],
                            //     "Вор в трущобах, беглец, невольный участник политических интриг"
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Прошлое", "value"],
                            //     "Сергей Князев – ветеран Афганской войны, человек, видевший смерть и предательство. Вернувшись в мирную жизнь, он столкнулся с еще большей несправедливостью: потерей жилья из-за бандитского произвола и равнодушия системы. Опыт войны закалил его, научил выживать и бороться до конца, но вместе с тем оставил глубокие шрамы на душе. Он циничен, немногословен и не склонен доверять людям, но в глубине души сохранил стремление к справедливости и готовность защищать слабых. Предательство тех, кому он верил, сделало его осторожным и подозрительным, но не сломило его волю к жизни."
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Отношения", "value"],
                            //     "Пока одинок, но постепенно обзаводится союзниками и врагами"
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Интеллект и творчество", "value"],
                            //     "Сообразителен, быстро учится, обладает стратегическим мышлением, проявляет смекалку в критических ситуациях. Скрытый магический потенциал."
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Скрытые цели", "value"],
                            //     "Найти способ вернуться домой или обрести новый дом, отомстить виновным в его бедах (как в прошлом, так и в настоящем)"
                            // ],
                            // [
                            //     ["Персонажи", "Главный герой", "Основные", "Мораль", "value"],
                            //     "Стремится к справедливости, но не чужд компромиссам и использованию сомнительных методов ради достижения цели. Готов помогать слабым и защищать невинных."
                            // ],
                            // [
                            //     ["Сюжетная арка", "Экспозиция", "value"],
                            //     "1. Москва, 1989 год. Сергей Князев, одетый в поношенную дембельскую форму, с трудом пробирается через толпу на вокзале. В руках у него видавший виды армейский вещмешок. Он ищет глазами встречающих, но никого не находит. Чувство одиночества накрывает его с головой. (1 час).\n2. Квартира Князева. Сергей стоит посреди пустой, обшарпанной квартиры. Обстановка убогая: старый диван, продавленный посередине, стол, покрытый клеенкой, и пара стульев. На стенах обои в цветочек давно выцвели. Он пытается найти хоть какие-то следы родителей, но находит лишь пыль и запустение. Слышен шум из-за стены – пьяная ругань соседей. (2 часа).\n3. Улица. Сергей бесцельно бродит по улицам города, пытаясь найти работу. Заходит в несколько мест, но везде получает отказ. Возле комиссионного магазина он замечает группу подозрительных личностей, о чем-то оживленно беседующих. Один из них, по кличке Шрам, бросает на Сергея презрительный взгляд. (4 часа).\n4. Заброшенный склад. Сергей устраивается на ночлег в заброшенном складе. В углу, на грязном матрасе, спит местный бомж по прозвищу Филин. Тот ворчливо оглядывает Князя, но ничего не говорит. Ночью Сергей просыпается от странных звуков – приглушенные голоса и лязг металла. Он осторожно выглядывает из-за укрытия и видит, как несколько бандитов пытают молодого мужчину, требуя деньги."
                            // ]
                        ]

                        const _json = JSON.parse(JSON.stringify(structPlot));

                        arr.forEach(([path, value]) => {
                            const [obj, key] = getObjectByPath(_json, path as string[]);
                            obj[key] = value;
                        })
                        change([], _json);
                        // console.log(_json)

                    }}
                >
                    load
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {

                        const arr = [];
                        walkAndFilter(useJsonStore.getState().json,
                            ({parent, key, value, hasChild, arrPath}) => {

                                if (!hasChild && key == 'value' && value) arr.push([arrPath, value]);

                                return value;
                            })

                        console.log(arr)
                    }}
                >
                    save
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                        // toggle collapse for root -> items
                        toggleCollapse(['Основные']);
                        toggleCollapse(['Вспомогательные']);
                        toggleCollapse(['Персонажи']);
                        toggleCollapse(['Сюжетная арка']);
                    }}
                >
                    Toggle "items" collapse
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {

                        const dataFilteredEmptyVal = walkAndFilter(useJsonStore.getState().json,
                            ({parent, key, value, hasChild, arrPath}) => {

                                if (parent?.hasOwnProperty('value') && parent.value == '') return null;
                                if (value?.hasOwnProperty('value') && value.value == '') return null;
                                if (value?.hasOwnProperty('options')) delete value.options
                                if (value?.hasOwnProperty('desc')) delete value.desc
                                if (value?.hasOwnProperty('example')) delete value.example
                                if (value?.hasOwnProperty('requirements')) delete value.requirements
                                if (value?.hasOwnProperty('variants')) delete value.variants
                                if (key != 'value' && isEmpty(value)) return null; // Убираем пустые узлы типа: {}
                                if (value?.hasOwnProperty('value') && typeof value.value != "object") return value.value; // Сжимаем объект в каждый узел подставляем значение value

                                return value;
                            })

                        walkAndFilter(dataFilteredEmptyVal, ({parent, key, value, hasChild, arrPath}) => {

                            // const [obj, key] = getObjectByPath(resultStruct, shortPath);

                            if (typeof value != "object") {
                                // console.log(arrPath, value)
                                useJsonStore.getState().setAtPath([...arrPath, 'value'], value);
                            }

                            return value;
                        })

                        // console.log(dataFilteredEmptyVal)
                    }}
                >
                    exp
                </button>
            </div>

            <JSONTreeEditor
                jsonData={structPlot}
                clbEditorValue={clbEditorValue}
                clbContainer={clbContainer}
                clbHeader={clbHeader}
            />

            <div className="h-[100vh]"></div>
        </div>
    );
};