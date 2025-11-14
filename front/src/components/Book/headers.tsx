// ~noinspection JSUnusedLocalSymbols
// ~@ts-nocheck
import {generateUID, getObjectByPath, getValueByPath, isEmpty, isEqualString, walkAndFilter} from "../../lib/utils.ts";
import {useBookStore, useImageStore} from "./store/storeBook.ts";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {CallbackParams, Clb, DefaultIcon} from "./BookTreeEditor.tsx";
import TextWrite from "../Auxiliary/TextWrite.tsx";
import ButtonEx from "../Auxiliary/ButtonEx.tsx";
import clsx from "clsx";
import {structPlotArc5, structPlotArc8, structPlotArcHero, structPlotArcTravelCase} from "./mapBook/structArcs.ts";
import {minorCharacter} from "./mapBook/structCharacters.ts";
import {structEventResult, structScene} from "./mapBook/structScene.ts";
import {Tooltip} from "../Auxiliary/Tooltip.tsx";
import {eventBus} from "../../lib/events.ts";
import {template} from "../../lib/strings.ts";
import {addImage, mergeBase64Images, toGPT, toImageGenerate} from "./general.utils.ts";
import {fnPromptTextHandling, promptImageCharacter, promptImageScene, promptWrite} from "./prompts.ts";
import DropdownButton from "../Auxiliary/DropdownButton.tsx";
import {LIST_KEY_NAME} from "./BookStory.tsx";
import Modal from "../Auxiliary/ModalWindow.tsx";
import ImageGallery from "../Auxiliary/GalleryImage.tsx";
import {
    BsArrowsCollapse,
    BsArrowsFullscreen,
    BsCheckAll,
    BsCircleHalf,
    BsCloudRain,
    BsEmojiFrown,
    BsEmojiSmile,
    BsEraserFill,
    BsFillPeopleFill,
    BsGear,
    BsGearFill,
    BsImage,
    BsLightning,
    BsPlusCircle,
    BsStack,
    BsStars,
    BsSun,
    BsThreeDotsVertical,
    BsX
} from "react-icons/bs";
import {RiImageAiFill} from "react-icons/ri";
import Checkbox from "../Auxiliary/Checkbox.tsx";
import {useShallow} from "zustand/react/shallow";
import {ImMan} from "react-icons/im";
import {GoStarFill} from "react-icons/go";

// @ts-ignore
window.q = useImageStore.getState;

const CONTROL_BTN = 'opacity-30 hover:opacity-100';
const SET_OPTIONS = 'options desc example requirements variants sceneImagePrompt';
let total = 0;

const TextInputEditor = ({doInput, value, placeholder, className = ''}) => {
    const [curVal, setCurVal] = useState(value);

    return <input value={curVal}
                  onChange={e => setCurVal(e.target.value)}
                  placeholder={placeholder}
                  onBlur={() => {
                      return doInput(curVal);
                  }}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                          doInput(curVal);
                      }
                  }}
                  className={className}
    />;
};

const getFreeIndex = (list: Record<string, any>, strPrefix: string) => {
    for (let i = 0; i < 1000; i++)
        if (!list[strPrefix + i]) return strPrefix + i;
    return 0;
};

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
               className={'w-[3em] ' + className}
        />
    </div>;
};
const CharacterHeader = (props: CallbackParams) => {

    const characterName = (props.value)?.['Имя полное']?.value;
    const characterDesc = (props.value)?.['Имя полное']?.desc;

    const [_val, set_val] = useState<any>(characterName);


    return <>
        <TextWrite
            className="text-black !w-auto"
            fitToTextSize={true}
            value={_val}

            onChange={(e) => set_val(e.target.value)}
            onBlur={() => useBookStore.getState().setAtPath(props.path.concat(['Имя полное', 'value']), _val)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    useBookStore.getState().setAtPath(props.path.concat(['Имя полное', 'value']), _val);
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
        {!isMinorCharacter && <div className="text-nowrap">{name} {isCharacters && '—'} </div>}
        {isAllCharacters && <div className="flex-row gap-1">
            <ButtonEx className={clsx("w-[24px] h-[24px] text-[11px]", CONTROL_BTN)} description="Создать персонажей"
                      title="Создать персонажей"
                      onConfirm={() => {
                          let book = useBookStore.getState().book;
                          let arr: string[] = props.value.value.split('\n');
                          // debugger
                          const arrExistCharacter =
                              Object.entries(book['Персонажи']['Второстепенные персонажи'])
                                  .filter(([key, _]) => key.toLocaleLowerCase().startsWith('перс'))
                                  .map(([_, it]) => it["Имя полное"].value)

                          if (Array.isArray(arr)) {
                              arr.forEach(characterDesc => {
                                  const charDesc = characterDesc.toLocaleLowerCase();
                                  const character = JSON.parse(JSON.stringify(minorCharacter));
                                  character['Общее описание'].value = characterDesc;

                                  if (charDesc.includes('главный герой')) {
                                      console.log('1)' + charDesc);
                                      if (book['Персонажи']['Главный герой']['Общее описание'].value) return;
                                      useBookStore.getState().mergeAtPath(['Персонажи', 'Главный герой', 'Общее описание'], {value: character})
                                  } else if (charDesc.includes('антагонист')) {
                                      console.log('2)' + charDesc);
                                      if (book['Персонажи']['Антагонист']['Общее описание'].value) return;
                                      useBookStore.getState().mergeAtPath(['Персонажи', 'Антагонист', 'Общее описание'], {value: character})
                                  } else {

                                      const isExist = arrExistCharacter.some(simpleName => {
                                          const arrNameIt = simpleName.toLocaleString().replaceAll(/\((.*?)\)/g, '$1').split(/[,-]/g).map((it: string) => it.toLocaleLowerCase().trim());
                                          return arrNameIt.some((name: string) => {
                                              return charDesc.substring(0, charDesc.search(/\s.\s/)).includes(name);
                                          })
                                      })
                                      if (isExist) return;
                                      const listForCheck = useBookStore.getState().book['Персонажи']['Второстепенные персонажи'];
                                      useBookStore.getState().mergeAtPath(['Персонажи', 'Второстепенные персонажи'], {[getFreeIndex(listForCheck, 'Персонаж-')]: character})
                                  }
                              })
                          }
                      }}>
                <BsStack size={14}/>
            </ButtonEx>
        </div>}
        {/*Персонажи кнопка [+]*/ isMinorCharacters && <>
            <ButtonEx className={clsx("w-[24px] h-[24px]", CONTROL_BTN)}
                      onClick={() => {
                          let book = useBookStore.getState().book;
                          const listForCheck = book['Персонажи']['Второстепенные персонажи'];
                          useBookStore.getState().mergeAtPath(props.path, {[getFreeIndex(listForCheck, 'Персонаж-')]: minorCharacter});
                      }}>
                <BsPlusCircle size="24"/>
            </ButtonEx>
        </>}
        {!isAllCharacters && !isMinorCharacters && <CharacterHeader {...props}/>}
        {isImageGen && <ButtonEx className={clsx('w-[24px] h-[24px]', CONTROL_BTN)} onConfirm={async () => {
            let book = useBookStore.getState().book;

            console.log(props.keyName)

            const arrPath = [
                [...props.path, 'Тело/физические характеристики'],
                [...props.path, 'Стиль и визуальные особенности']
            ]

            const arr = extractCommonValues(arrPath as string[][]);

            let styleGeneral = book?.['Общие']?.['Визуальный стиль изображений']?.value;
            let styleCharacter = book?.['Персонажи']?.['Визуальный стиль персонажей']?.value;

            const prompt = template(promptImageCharacter, null, {styleGeneral, styleCharacter, desc: arr.join('\n')});

            const imgBase64 = await toImageGenerate({prompt, param: {aspect_ratio: '3:4'}});

            await useImageStore.getState().addImages(props.keyName + '', imgBase64)
        }}><BsImage size="24"/></ButtonEx>}
    </>;
};

const ImagesPanel = (props: {
    idFrame: string,
    show: boolean,
    onHide: () => void,
    arrImgList: [string, unknown][],
    filter: ([key, arr]: readonly [any, any]) => any,
    caption: string,
}) => {
    const {frame, setFrame, removeFrame} = useImageStore(useShallow((s) => ({
        frame: s.frame,
        setFrame: s.setFrame,
        removeFrame: s.removeFrame,
    })));
    return <Modal show={props.show} onHide={props.onHide} autoSize={false}>
        <Modal.Header>
            <Modal.Title className="text-sm">{props.caption}</Modal.Title>
        </Modal.Header>
        {props.arrImgList?.length > 0 && <div className="py-2 flex flex-wrap gap-3 justify-center w-[60vw]">
            {props.arrImgList.filter(props.filter).map(([keyName, listImage], i) => {
                    const arrKey = Object.keys(listImage);
                    const arrValue = Object.values(listImage);

                    return <div key={i} className={clsx(
                        'p-3 rounded-sm',
                        // 'bg-black/5',
                        'ring-1 ring-black/10 shadow-md'
                    )}>
                        <ImageGallery
                            images={arrValue as string[][]}
                            onRenderImage={(src, index) => {
                                return (
                                    <div className="relative">
                                        <img id={keyName} src={src} alt={`custom-${index}`}
                                             className="h-35 object-cover rounded-sm hover:opacity-80 transition"/>
                                        <Checkbox
                                            className={clsx(
                                                "!absolute bottom-0.5 right-0.5 w-5 h-5 bg-white hover:bg-white/80 active:bg-white/60",
                                                "rounded-sm",
                                            )}
                                            checked={frame?.[props.idFrame]?.includes(keyName + '.' + arrKey[index])}
                                            onChange={(_, checked) => {
                                                const selectedKey = keyName + '.' + arrKey[index];
                                                if (checked) {
                                                    setFrame(props.idFrame, selectedKey);
                                                } else {
                                                    removeFrame(props.idFrame, selectedKey);
                                                }
                                            }}/>
                                    </div>
                                );
                            }}
                        />
                    </div>
                }
            )}
        </div>}
    </Modal>;
};

const SceneHeader = (props: CallbackParams) => {
    const {path, value} = props;

    const [openModalSelectCharacter, setOpenModalSelectCharacter] = useState(false);
    const sceneName = value?.['Название кратко']?.value;
    const sceneDesc = value?.['Название кратко']?.desc;

    const [_val, set_val] = useState<any>(sceneName);
    const arrImgList = Object.entries(useImageStore.getState().images);

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
        <div className="flex flex-wrap">

            <ButtonEx className={clsx("h-[24px]", CONTROL_BTN)} onClick={() => setOpenModalSelectCharacter(true)}>
                <BsFillPeopleFill size={14}/>
                <sup>+</sup>
            </ButtonEx>

            {openModalSelectCharacter &&
                <ImagesPanel
                    idFrame={props.path.at(-1) as string}
                    show={openModalSelectCharacter} onHide={() => setOpenModalSelectCharacter(false)}
                    arrImgList={arrImgList}
                    filter={([key, _]) => key.includes('Персонаж') || key.includes('Главный') || key.includes('Антагонист')}
                    caption="Выбор песонажей для сцены"/>}
            <ButtonEx
                className={clsx('w-[24px] h-[24px]', CONTROL_BTN)}
                description="Создать изображение сцены"
                onConfirm={async () => {
                    let book = useBookStore.getState().book;

                    let images = useImageStore.getState().images;
                    const arr = useImageStore.getState().frame?.[props.keyName] ?? [];

                    let imgScene: string = '';
                    let arrImgCharacter: string[] = [];
                    let arrDescCharacter: string[] = [];
                    arr.forEach((halfPath) => {
                        const [name, index] = halfPath.split('.');
                        if (name.includes('Персонаж')) {
                            arrImgCharacter.push(images[name][index]);
                            const desc = book['Персонажи']['Второстепенные персонажи'][name]['Имя полное'].value;
                            arrDescCharacter.push(desc)
                        }
                        if (name.includes('Главный')) {
                            arrImgCharacter.push(images[name][index]);
                            const desc = book['Персонажи']['Главный герой']['Имя полное'].value;
                            arrDescCharacter.push(desc)
                        }
                        if (name.includes('Антагонист')) {
                            arrImgCharacter.push(images[name][index]);
                            const desc = book['Персонажи']['Антагонист']['Имя полное'].value;
                            arrDescCharacter.push(desc)
                        }
                        if (name.includes('Сцена')) imgScene = images[name][index];
                    })

                    const img = await mergeBase64Images({
                        images: arrImgCharacter,
                        gap: 10,
                        backgroundColor: 'black',
                        outputFormat: 'image/webp',
                        jpegQuality: 1,
                        scaleFactor: 0.5
                    });

                    const imgHandled = await addImage(img, 'image/webp', 100);

                    // openBase64ImageInNewTab(imgHandled, 'image/webp')

                    let style = book?.['Общие']?.['Визуальный стиль изображений']?.value;

                    const scene = getValueByPath(book, props.path);
                    const desc = scene['Описание сцены'].value;
                    const details = scene['Детали окружения'].value;

                    const prompt = template(getValueByPath(book, [...props.path, 'sceneImagePrompt']), null, {
                        style,
                        characters: arrDescCharacter,
                        desc: desc + '\n' + details
                    });

                    const res = await toImageGenerate({prompt, param: {aspect_ratio: '1:1', arrImage: [imgHandled]}});
                    await useImageStore.getState().addImages(props.keyName + '', res);
                }}><RiImageAiFill/></ButtonEx>
        </div>
    </>
}

const PlotArc = (props: CallbackParams) => {

    if ((props.path)[0] != 'Сюжетная арка') return null;

    const tags = props.value?.options?.tags;
    const isSceneItem = tags?.includes('scene');
    const isPlotArc = isEqualString(tags, 'plot-arc');
    const isPlotArcItem = tags?.includes('plot-arc-item');
    const isArcEventsItem = tags?.includes('arc-events');
    const isEvent = isEqualString(tags, 'event');

    const isSceneHeader = tags?.includes('scene');
    const isFrames = isEqualString(tags, 'frames');
    const isFrame = isEqualString(tags, 'frame');
    const isArt = isEqualString(tags, 'art');

    let isOptions = LIST_KEY_NAME[props.keyName];
    let name: any = isOptions ?? props.keyName;
    if (isSceneItem) name = null; // Убираем имя заголовка для сцены
    if (isEvent) name = 'Событие';

    if (!(isSceneItem || isPlotArc || isPlotArcItem || isArcEventsItem || isSceneHeader || isFrames || isFrame || isArt || isEvent))
        return <div className="text-nowrap">{name}</div>;

    return <>
        <div className="text-nowrap">{name}</div>
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
        {isPlotArcItem && <div className="flex flex-row gap-1">
            <ButtonEx className={clsx("w-[24px] h-[24px]", CONTROL_BTN)}
                      onClick={() => {
                          let book = useBookStore.getState().book;
                          const listForCheck = getValueByPath(book, props.path);
                          useBookStore.getState().mergeAtPath(props.path, {[getFreeIndex(listForCheck, props.keyName + '-cцена-')]: structScene});
                      }}>
                <BsPlusCircle size={14}/>
            </ButtonEx>
            <ButtonEx
                className={clsx(CONTROL_BTN)}
                title="Cоздать сцены"
                description="Cоздать сцены"
                onConfirm={() => {
                    const arr = props.value.value.split('\n')
                    if (Array.isArray(arr)) {
                        arr.forEach(item => {
                            let _structScene = JSON.parse(JSON.stringify(structScene));
                            _structScene['Краткое описание'].value = item;

                            let book = useBookStore.getState().book;
                            const listForCheck = getValueByPath(book, props.path);

                            const nameScene = getFreeIndex(listForCheck, props.keyName + '-cцена-') + '';
                            useBookStore.getState().mergeAtPath(props.path, {[nameScene]: _structScene});
                            useBookStore.getState().toggleCollapse([...(props.path), nameScene]);
                            useBookStore.getState().toggleCollapse([...(props.path), nameScene, '']);
                        })
                    }
                }}>
                <BsStack size={14}/>
            </ButtonEx>
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
            <ButtonEx className={clsx("w-[24px] h-[24px]", CONTROL_BTN)}
                      title={'Добавить событие'}
                      onClick={() => {
                          let book = useBookStore.getState().book;
                          // debugger
                          const listForCheck = getValueByPath(book, props.path);
                          useBookStore.getState().mergeAtPath(props.path, {[getFreeIndex(listForCheck, props.path.at(-2) + '-событие-')]: structEventResult});
                      }}>
                <BsPlusCircle size="24"/>
            </ButtonEx>
        </div>}
        {isEvent && <div className="flex flex-row gap-1">
            <Tooltip text={"Количество букв"} direction={"right"} className={clsx(
                'text-gray-500', CONTROL_BTN)}>
                <InputNumberEditor
                    className={"text-center"}
                    value={props.value.options.numberOfLetters}
                    doInput={(val: number) => {
                        if (isNaN(val)) val = 6;
                        props.toWrite(val, [...(props.path), 'options', 'numberOfLetters']);
                    }}
                />
            </Tooltip>
            <Tooltip text={"Количество символов"} direction={"right"} className={clsx('text-gray-500', CONTROL_BTN)}>
                [{Math.round(Object.values(props.value)?.[2]?.['value']?.length)}]
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
        const isImgPattern = isEqualString(tags, 'sceneImagePrompt');
        const isScene = isEqualString(props.parent?.options?.tags, 'scene');
        const isArt = isEqualString(tags, 'art');

        let book = useBookStore.getState().book;

        if (isImgPattern) {

            const strValue = getValueByPath(book, [...props.path, 'value']) ?? '';
            const strStyle = book?.['Общие']?.['Визуальный стиль изображений']?.value ?? '';
            const strDesc = getValueByPath(book, [...props.path, 'Описание сцены', 'value']) ?? '';
            const strDetails = getValueByPath(book, [...props.path, 'Детали окружения', 'value']) ?? '';

            if (!strValue && strStyle && strDesc && strDetails) {
                const artDescImg = book?.['Общие']?.['Визуальный стиль изображений']?.value + '\n' +
                    getValueByPath(book, [...props.path.slice(0, -1), 'Описание сцены', 'value']) + '\n' +
                    getValueByPath(book, [...props.path.slice(0, -1), 'Детали окружения', 'value']);

                const prompt = template(promptImageScene, null, {artDescImg});
                let resultStruct = await toGPT(prompt);

                props.toWrite(resultStruct, [...props.path, 'sceneImagePrompt']);
            }
        }
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

        source = deleteFields(source, ['Результат', 'Визуальный стиль изображений']);

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

        let resultStruct = await toGPT(
            promptWrite,
            {
                source: JSON.stringify(source, null, 2),
                path: '["' + props.path.join('"."') + '"]'
            }, llm);

        total = 0;
        eventBus.dispatchEvent('message-local', {type: 'progress', data: 0})
        applyGPTResult(resultStruct, listPathSrc);
    }, []);

    const {
        addEvil,
        addKindness,
        addNegative,
        addPositive,
        collapseText,
        expandText,
        inverseText,
        addActions,
        addImprove,
        humanize
    } = fnPromptTextHandling;

    const isValue = props.value?.hasOwnProperty('value') && typeof props.value.value !== "object";

    return <>
        <ButtonEx className={clsx('w-[24px] h-[24px] transition', CONTROL_BTN)}
                  onConfirm={() => generateTextGPT(0)} title="Генерация простая" description="Генерация простая">
            <BsStars size={14}/>
        </ButtonEx>
        {/*<ButtonEx className={clsx('w-[24px] h-[24px] hover:!bg-teal-500 hover:text-white transition', CONTROL_BTN)}*/}
        {/*          onConfirm={() => generateTextGPT(1)} title="Генерация простая +кэш"*/}
        {/*          description="Генерация простая +кэш">*/}
        {/*    <BsStars size={14}/>*/}
        {/*</ButtonEx>*/}
        <ButtonEx className={clsx('w-[24px] h-[24px] hover:!bg-gray-600 hover:text-white transition', CONTROL_BTN)}
                  onConfirm={() => generateTextGPT(2)} title="Генерация" description="Генерация средняя">
            <GoStarFill size={14}/>
        </ButtonEx>
        {/*<ButtonEx className={clsx('w-[24px] h-[24px] hover:!bg-red-500 hover:text-white transition', CONTROL_BTN)}*/}
        {/*          onConfirm={() => generateTextGPT(3)} title="Генерация максимальная"*/}
        {/*          description="Генерация максимальная">*/}
        {/*    <BsStars size={14}/>*/}
        {/*</ButtonEx>*/}
        {isValue &&
            <DropdownButton
                title={<div className="w-[24px] content-center justify-items-center"><BsThreeDotsVertical size={14}/>
                </div>}
                className={'!w-[24px] h-[24px] px-1 ' + CONTROL_BTN}
                isChevron={false}>
                <div className={clsx(
                    'flex flex-col bg-white gap-0.5',
                    'outline-1 outline-gray-200 rounded-[5px] p-2'
                )}>
                    <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addKindness, props.path)}
                              title={addKindness.desc}>
                        <BsSun/></ButtonEx>
                    <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addEvil, props.path)} title={addEvil.desc}>
                        <BsCloudRain/></ButtonEx>
                    <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addPositive, props.path)}
                              title={addPositive.desc}>
                        <BsEmojiSmile/></ButtonEx>
                    <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addNegative, props.path)}
                              title={addNegative.desc}>
                        <BsEmojiFrown/></ButtonEx>
                    <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, expandText, props.path)}
                              title={expandText.desc}>
                        <BsArrowsFullscreen/></ButtonEx>
                    <ButtonEx className={clsx('vertical w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, collapseText, props.path)}
                              title={collapseText.desc}>
                        <BsArrowsCollapse/></ButtonEx>
                    <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, inverseText, props.path)}
                              title={inverseText.desc}>
                        <BsCircleHalf/></ButtonEx>
                    <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addActions, props.path)}
                              title={addActions.desc}>
                        <BsLightning/></ButtonEx>
                    <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, addImprove, props.path)}
                              title={addImprove.desc}>
                        <BsCheckAll/></ButtonEx>
                    <ButtonEx className={clsx('w-[24px] h-[24px]')} stopPropagation={true}
                              onAction={() => handleTextGPT(props.value, humanize, props.path)}
                              title={humanize.desc}>
                        <ImMan/>
                    </ButtonEx>
                </div>
            </DropdownButton>}
    </>
};

export const clbHeader: Clb = (props: CallbackParams) => {
    const arrSize = [14, 14, 14];

    let tags = props.value?.options?.tags;
    const options = props.value?.options;
    const isToggle = !options?.excludes?.includes('toggle') && Object.keys(props.value).filter(it => !SET_OPTIONS.includes(it)).length > 0;
    const isHide = isEqualString(tags, 'hide');

    if (isHide) {
        return null;
    }

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
                className={clsx("w-[24px] h-[24px] hover:!bg-sky-600 hover:text-white transition", CONTROL_BTN)}
                description="Очистить"
                onConfirm={() => walkAndFilter(props.value, ({key, value, arrPath}) => {
                    key == 'value' && useBookStore.getState().setAtPath(props.path.concat(arrPath), '');
                    return value;
                })}>
                <BsEraserFill size={14}/>
            </ButtonEx>
            {options?.tags?.includes('deletable') && <ButtonEx
                className={clsx("hover:!bg-red-700 hover:text-white transition", CONTROL_BTN)}
                description="Удалить"
                onConfirm={() => useBookStore.getState().removeAtPath(props.path)}>
                <BsX size="16"/>
            </ButtonEx>}
            {(props.value?.desc || props.value?.example || props.value?.requirements || props.value?.sceneImagePrompt) &&
                <ButtonEx className={clsx('w-[24px] h-[24px]', CONTROL_BTN,)} onClick={() => {
                    const _path = [...(props.path), 'options', 'forcedIncludes'];
                    useBookStore.getState().setAtPath(_path, props.value?.options?.forcedIncludes ? '' : SET_OPTIONS);
                }}>
                    {props.value?.options?.forcedIncludes ? <BsGearFill size={14}/> : <BsGear size={14}/>}
                </ButtonEx>
            }
        </div>}
    </div>
}