import React, {useCallback, useEffect, useRef, useState} from "react";
import JSONTreeEditor, {CallbackParams, Clb, DefaultIcon} from "./JSONTreeEditor";
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
import data from "./data/data.json" with {type: "json"};
import {useJsonStore} from "./store/storeBook.ts";
import dialog from "../Auxiliary/Dialog.tsx";


const CONTROL_BTN = 'opacity-30 hover:opacity-100';
const SET_OPTIONS = 'options desc example requirements variants';
const LIST_KEY_NAME = {desc: 'Описание', example: 'Пример', requirements: 'Требования', variants: 'Варианты'};

// forced update browse
// if (+localStorage.getItem('___refresh') < Date.now()) {
//     localStorage.setItem('___refresh', String(Date.now() + 3000));
//     window.location.reload();
// }

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
                setCurVal((val) => val + (e.deltaY > 0 ? -1 : 1));
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

const applyGPTResult = (resultStruct: any, listPathSrc: {}) =>
    walkAndFilter(resultStruct, ({parent, key, value, hasChild, arrPath}) => {
        if (value?.hasOwnProperty('id')) {
            const id = value.id;
            let val = value?.target?.replaceAll?.(/\n\n/g, '\n');
            if (typeof val != 'string') return value;

            const path = listPathSrc[id];
            const [obj, key] = getObjectByPath(useJsonStore.getState().json, path);
            if (obj?.hasOwnProperty('value')) {
                useJsonStore.getState().setAtPath(path, val);
            } else {
                debugger;
                console.error('Тип результата не соответствует', val);
            }
        }
        return value;
    });

const deleteFields = (dataStruct: any, arrFields) =>
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

    const dataFilteredEmptyVal = walkAndFilter(dataStruct, ({parent, key, value, hasChild, arrPath}) => {

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
    dataStruct = walkAndFilter(dataStruct, ({key, value}) => {
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

const ImageUploadBase64: React.FC = () => {
    const [base64, setBase64] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBase64(reader.result as string);
                console.log(reader.result)
            };
            reader.readAsDataURL(file); // Преобразует файл в base64
        }
    };

    return (
        <div>
            <input type="file" accept="image/*" onChange={handleFileChange}/>
            {base64 && (
                <div>
                    <img src={base64} alt="Uploaded" style={{maxWidth: '300px', marginTop: '10px'}}/>
                </div>
            )}
        </div>
    );
};

const SceneHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    const sceneName = value?.['Название кратко']?.value;
    const sceneDesc = value?.['Название кратко']?.desc;

    const [_val, set_val] = useState<any>(sceneName);


    return <>
        <TextWrite
            className="text-black !w-auto"
            fitToTextSize={true}
            value={_val}

            onChange={(e) => set_val(e.target.value)}
            onBlur={() => useJsonStore.getState().setAtPath(path.concat(['Название кратко', 'value']), _val)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    useJsonStore.getState().setAtPath(path.concat(['Название кратко', 'value']), _val);
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
                      // eventBus.dispatchEvent('set-scroll-top', useJsonStore.getState().temp?.scrollTop);
                  }}/>
    </>;
};
const CharacterHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

    const characterName = value?.['Имя кратко']?.value;
    const characterDesc = value?.['Имя кратко']?.desc;

    const [_val, set_val] = useState<any>(characterName);


    return <>
        <TextWrite
            className="text-black !w-auto"
            fitToTextSize={true}
            value={_val}

            onChange={(e) => set_val(e.target.value)}
            onBlur={() => useJsonStore.getState().setAtPath(path.concat(['Имя кратко', 'value']), _val)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    useJsonStore.getState().setAtPath(path.concat(['Имя кратко', 'value']), _val);
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
    const isAllCharacters = value?.options?.tags?.includes('all-characters');
    const isArcEventsItem = value?.options?.tags?.includes('arc-events');

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
                <InputNumberEditor
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
                        const nameScene = 'Сцена-' + getID();
                        useJsonStore.getState().mergeAtPath(path, {[nameScene]: _structScene});
                        useJsonStore.getState().toggleCollapse([...path, nameScene]);
                        useJsonStore.getState().toggleCollapse([...path, nameScene, '']);
                    })
                }
            }}/>
        </div>}
        {isAllCharacters && <div className="flex flex-row gap-1">
            <ButtonEx className={clsx("bi-stack w-[24px] h-[24px] text-[11px]", CONTROL_BTN)} onClick={() => {
                let json = useJsonStore.getState().json;
                let arr: string[] = value.value.split('\n');
                const arrExistCharacter1 = Object.entries(json['Персонажи']['Второстепенные песонажи']).filter(([key, value]) => key.toLocaleLowerCase().startsWith('перс')).map(([_, it]) => it["Имя полное"].value)
                const arrExistCharacter2 = Object.entries(json['Персонажи']['Второстепенные песонажи']).filter(([key, value]) => key.toLocaleLowerCase().startsWith('перс')).map(([_, it]) => it["Имя кратко"].value)
                const arrExistCharacter = [...arrExistCharacter1, ...arrExistCharacter2];

                if (Array.isArray(arr)) {
                    arr = arr.filter(characterDesc => {
                        const charDesc = characterDesc.toLocaleLowerCase();
                        const character = JSON.parse(JSON.stringify(minorCharacter));
                        character['Общее описание'].value = characterDesc;

                        if (charDesc.includes('главный герой')) {
                            console.log('1)' + charDesc);
                            if (json['Персонажи']['Главный герой']['Общее описание'].value) return;
                            useJsonStore.getState().mergeAtPath(['Персонажи', 'Главный герой', 'Общее описание'], {value: character})
                        } else if (charDesc.includes('антогонист')) {
                            console.log('2)' + charDesc);
                            if (json['Персонажи']['Антогонист']['Общее описание'].value) return;
                            useJsonStore.getState().mergeAtPath(['Персонажи', 'Антогонист', 'Общее описание'], {value: character})
                        } else {

                            const isExist = arrExistCharacter.some(simpleName => {
                                const arrNameIt = simpleName.toLocaleString().split(',').map((it: string) => it.toLocaleLowerCase().trim());
                                return arrNameIt.some((name: string) => {
                                    return charDesc.substring(0, charDesc.search(/\s.\s/)).includes(name);
                                })
                            })
                            if (isExist) return;

                            useJsonStore.getState().mergeAtPath(['Персонажи', 'Второстепенные песонажи'], {['Персонаж-' + getID()]: character})
                        }
                    })
                    useJsonStore.getState().mergeAtPath(['Персонажи', 'Все персонажи'], {value: arr.join('\n')});
                }
            }}/>
        </div>}
        {isArcEventsItem && <div className="flex flex-row gap-1">
            <Tooltip text={"Количество событий на сцене"} direction={"right"} className={clsx(
                'text-gray-500', CONTROL_BTN)}>
                <InputNumberEditor
                    className={"text-center"}
                    value={value.options.quantEvents}
                    doInput={(val: number) => {
                        if (isNaN(val)) val = 3;
                        toWrite(val, [...path, 'options', 'quantEvents']);
                    }}
                />
            </Tooltip>
        </div>}
    </>;
};
let total = 0;
const GPTHeader = (props: CallbackParams) => {
    const {children, deep, header, keyName, parent, path, toWrite, value, collapsed} = props;

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

        let source = {};
        let target = JSON.parse(JSON.stringify(text));

        const _value = target.value;
        const countWords = _value.split(' ').length; // Посчитаем слова

        target.example = fnPrompt?.example ?? '';
        target.value = '';

        const src = useJsonStore.getState().json;

        let obj: { [x: string]: any; }, key: string | number;
        [obj, key] = getObjectByPath(src, ['Общие', 'Основные', 'Жанр', 'value'])
        const genre = obj[key];
        [obj, key] = getObjectByPath(src, ['Общие', 'Основные', 'Общее настроение', 'value'])
        const mood = obj[key];
        [obj, key] = getObjectByPath(src, ['Общие', 'Основные', 'Эпоха', 'value'])
        const age = obj[key];
        [obj, key] = getObjectByPath(src, ['Общие', 'Основные', 'Возраст аудитории', 'value'])
        const ageLimit = obj[key];

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
        source = walkAndFilter(source, ({parent, key, value, hasChild, arrPath}) => {
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

        let resultStruct = await toGPT(promptWrite, {source, path: path.join('.')});

        total = 0;
        eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})

        applyGPTResult(resultStruct, listPathSrc);

    }, []);

    const generateTextGPT = useCallback(async () => {

        let json = useJsonStore.getState().json;
        let source = JSON.parse(JSON.stringify(json));
        source = prepareStructureFirst(source);

        let target = JSON.parse(JSON.stringify(value));

        let numberValue = 0;
        walkAndFilter(target, ({value}) => {
            if (value?.hasOwnProperty('value')) numberValue++;
            return value;
        });

        if (numberValue == 1) target = walkAndFilter(target, ({value}) => {
            if (value?.hasOwnProperty('value')) value.value = '';
            return value;
        });

        const [obj, key] = getObjectByPath(source, path as string[]);
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
                path: '["' + path.join('"."') + '"]'
            });

        total = 0;
        eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})

        applyGPTResult(resultStruct, listPathSrc);

    }, []);

    const {
        addEvil, addKindness, addNegative, addPositive, collapseText, expandText, inverseText, addActions, addImprove
    } = fnPromptTextHandling;

    const isValue = value?.hasOwnProperty('value') && typeof value.value !== "object";

    return <>
        <ButtonEx className={clsx('bi-stars w-[24px] h-[24px]', CONTROL_BTN)}
                  onAction={() => generateTextGPT()} title="Генерация"/>
        {isValue &&
            <DropdownButton title={<div className="bi-three-dots-vertical"/>} className={'px-1 ' + CONTROL_BTN}
                            isChevron={false}>
                <div className={clsx(
                    'flex flex-col bg-white gap-0.5',
                    'outline-1 outline-gray-200 rounded-[5px] p-2'
                )}>
                    <ButtonEx className={clsx('bi-sun w-[24px] h-[24px]')}
                              onAction={() => handleTextGPT(value, addKindness, path)} title={addKindness.desc}/>
                    <ButtonEx className={clsx('bi-cloud-rain w-[24px] h-[24px]')}
                              onAction={() => handleTextGPT(value, addEvil, path)} title={addEvil.desc}/>
                    <ButtonEx className={clsx('bi-emoji-smile w-[24px] h-[24px]')}
                              onAction={() => handleTextGPT(value, addPositive, path)} title={addPositive.desc}/>
                    <ButtonEx className={clsx('bi-emoji-frown w-[24px] h-[24px]')}
                              onAction={() => handleTextGPT(value, addNegative, path)} title={addNegative.desc}/>
                    <ButtonEx className={clsx('bi-arrows-fullscreen w-[24px] h-[24px]')}
                              onAction={() => handleTextGPT(value, expandText, path)} title={expandText.desc}/>
                    <ButtonEx className={clsx('bi-arrows-collapse-vertical w-[24px] h-[24px]')}
                              onAction={() => handleTextGPT(value, collapseText, path)} title={collapseText.desc}/>
                    <ButtonEx className={clsx('bi-circle-half w-[24px] h-[24px]')}
                              onAction={() => handleTextGPT(value, inverseText, path)} title={inverseText.desc}/>
                    <ButtonEx className={clsx('bi-lightning w-[24px] h-[24px]')}
                              onAction={() => handleTextGPT(value, addActions, path)} title={addActions.desc}/>
                    <ButtonEx className={clsx('bi-check-all w-[24px] h-[24px]')}
                              onAction={() => handleTextGPT(value, addImprove, path)} title={addImprove.desc}/>
                </div>
            </DropdownButton>}
    </>
};

export const StoryEditor: React.FC = () => {

    const {change, reset, json, toggleCollapse} = useJsonStore(useShallow((s) => ({
        change: s.setAtPath,
        reset: s.reset,
        json: s.json,
        toggleCollapse: s.toggleCollapse,
    })));

    // @ts-ignore
    window.store = useJsonStore.getState()

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
        const isSceneHeader = (isChildOf(strPath, 'сюжетная-арка') && options?.tags?.includes('scene'));
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
            {!isOptions && <div className="flex flex-row flex-1 justify-end">
                <ButtonEx // Кнопка очистить поля
                    className={clsx("bi-eraser-fill w-[24px] h-[24px] hover:!bg-sky-600 hover:text-white transition", CONTROL_BTN)}
                    description="Очистить"
                    onConfirm={() => walkAndFilter(value, ({key, value, arrPath}) => {
                        key == 'value' && useJsonStore.getState().setAtPath(path.concat(arrPath), '');
                        return value;
                    })}/>
                <ButtonEx className={clsx(
                    value?.options?.forcedIncludes ? 'bi-gear-fill' : 'bi-gear',
                    'w-[24px] h-[24px]',
                    CONTROL_BTN,
                )} onClick={() => {
                    const _path = [...path, 'options', 'forcedIncludes'];
                    change(_path, value?.options?.forcedIncludes ? '' : SET_OPTIONS);
                }}/>
            </div>}
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
                    onClick={() => {
                        change([], structPlot);
                    }}
                >
                    Reset store
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                        change([], data);
                    }}
                >
                    load
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                        console.log(useJsonStore.getState().json)
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
                <ImageUploadBase64/>
            </div>

            <JSONTreeEditor
                clbEditorValue={clbEditorValue}
                clbContainer={clbContainer}
                clbHeader={clbHeader}
            />

            <div className="h-[100vh]"></div>
        </div>
    );
};