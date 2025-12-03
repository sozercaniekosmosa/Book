// ~noinspection JSUnusedLocalSymbols
// ~@ts-nocheck
import {getObjectByPath, getValueByPath, isEqualString, walkAndFilter} from "../../lib/utils.ts";
import {useBookStore, useImageStore} from "./store/storeBook.ts";
import React, {useEffect, useRef, useState} from "react";
import {CallbackParams, Clb, DefaultIcon} from "./BookTreeEditor.tsx";
import TextWrite from "../Auxiliary/TextWrite.tsx";
import ButtonEx from "../Auxiliary/ButtonEx.tsx";
import clsx from "clsx";
import {structPlotArc5, structPlotArc8, structPlotArcHero, structPlotArcTravelCase} from "./mapBook/structArcs.ts";
import {minorCharacter} from "./mapBook/structCharacters.ts";
import {structEventResult, structScene} from "./mapBook/structScene.ts";
import {Tooltip} from "../Auxiliary/Tooltip.tsx";
import {template} from "../../lib/strings.ts";
import {addImage, mergeBase64Images, openBase64ImageInNewTab, toImageGenerate} from "./general.utils.ts";
import {promptImageCharacter, promptImageScene} from "./prompts.ts";
import {LIST_KEY_NAME} from "./BookStory.tsx";
import Modal from "../Auxiliary/ModalWindow.tsx";
import ImageGallery from "../Auxiliary/GalleryImage.tsx";
import {BsEraserFill, BsFillPeopleFill, BsGear, BsGearFill, BsImage, BsPlusCircle, BsStack, BsX} from "react-icons/bs";
import {RiImageAiFill} from "react-icons/ri";
import Checkbox from "../Auxiliary/Checkbox.tsx";
import {useShallow} from "zustand/react/shallow";

import {GPTHeader} from "./GPTHeader.tsx";

// @ts-ignore
window.q = useImageStore.getState;

export const CSS_BTN = 'opacity-30 hover:opacity-100';
const SET_OPTIONS = 'options desc example requirements variants sceneImagePrompt';

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

export const extractCommonValues = (arrPath: string[][]) =>
    arrPath.map((path: string[]) => {
        const [obj, key] = getObjectByPath(useBookStore.getState().book, [...path, 'value']);
        return obj[key];
    });

const pathHandler = (path: (string | number)[]) => {
    return path.join('.').toLocaleLowerCase().replaceAll(/[^a-zA-Zа-яА-Я.]/g, '-');
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
            <ButtonEx className={clsx("w-[24px] h-[24px] text-[11px]", CSS_BTN)} description="Создать персонажей"
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
                                  const characters = useBookStore.getState().book['Персонажи'];

                                  if (charDesc.includes('главный герой') && !characters['Главный герой']?.['Общее описание'].value) {
                                      useBookStore.getState().mergeAtPath(['Персонажи', 'Главный герой', 'Общее описание'], {value: character['Общее описание'].value});
                                  } else if (charDesc.includes('антагонист') && !characters['Антагонист']?.['Общее описание'].value) {
                                      useBookStore.getState().mergeAtPath(['Персонажи', 'Антагонист', 'Общее описание'], {value: character['Общее описание'].value});
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
            <ButtonEx className={clsx("w-[24px] h-[24px]", CSS_BTN)}
                      onClick={() => {
                          let book = useBookStore.getState().book;
                          const listForCheck = book['Персонажи']['Второстепенные персонажи'];
                          useBookStore.getState().mergeAtPath(props.path, {[getFreeIndex(listForCheck, 'Персонаж-')]: minorCharacter});
                      }}>
                <BsPlusCircle size="24"/>
            </ButtonEx>
        </>}
        {!isAllCharacters && !isMinorCharacters && <CharacterHeader {...props}/>}
        {isImageGen && <ButtonEx className={clsx('w-[24px] h-[24px]', CSS_BTN)} description="Генерация персонажа"
                                 title="Генерация персонажа" onConfirm={async () => {
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

            <ButtonEx className={clsx("h-[24px]", CSS_BTN)} onClick={() => setOpenModalSelectCharacter(true)}>
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
                className={clsx('w-[24px] h-[24px]', CSS_BTN)}
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

                    const imgHandled = await addImage(img, 'image/webp', 100);

                    // openBase64ImageInNewTab(imgHandled, 'image/webp')

                    const _scene = getValueByPath(book, props.path);
                    const imageDesc = arrDescCharacter.join(', ');
                    const style = book?.['Общие']?.['Визуальный стиль изображений']?.value;
                    const scene = _scene['Описание сцены'].value;
                    const characters = _scene['Персонажи'].value;
                    const details = _scene['Детали окружения'].value;
                    const events = _scene['События'].value;

                    const prompt = template(promptImageScene, null, {
                        imageDesc, scene, style, characters, details, events
                    });

                    console.log(prompt);
                    openBase64ImageInNewTab(imgHandled, 'image/webp')

                    // const res = await toImageGenerate({prompt, param: {aspect_ratio: '1:1', arrImage: [imgHandled]}});
                    // await useImageStore.getState().addImages(props.keyName + '', res);
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
                            className={clsx(plotName == props.value?.options?.name && 'bg-gray-300', 'h-[19px]', CSS_BTN)}
                            description={"Изменить на " + plotName}
                            onConfirm={() => props.toWrite(plot)}
                            disabled={plotName == props.value?.options?.name}
                        >
                            {plotName as string}
                        </ButtonEx>)}</>
            </div>
        }
        {isPlotArcItem && <div className="flex flex-row gap-1">
            <ButtonEx className={clsx("w-[24px] h-[24px]", CSS_BTN)}
                      onClick={() => {
                          let book = useBookStore.getState().book;
                          const listForCheck = getValueByPath(book, props.path);
                          useBookStore.getState().mergeAtPath(props.path, {[getFreeIndex(listForCheck, props.keyName + '-cцена-')]: structScene});
                      }}>
                <BsPlusCircle size={14}/>
            </ButtonEx>
            <ButtonEx
                className={clsx(CSS_BTN)}
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
                'text-gray-500', CSS_BTN)}>
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
                'text-gray-500', CSS_BTN)}>
                <InputNumberEditor
                    className={"text-center"}
                    value={props.value.options.quantEvents}
                    doInput={(val: number) => {
                        if (isNaN(val)) val = 3;
                        props.toWrite(val, [...(props.path), 'options', 'quantEvents']);
                    }}
                />
            </Tooltip>
            <ButtonEx className={clsx("w-[24px] h-[24px]", CSS_BTN)}
                      title={'Добавить событие'}
                      onClick={() => {
                          let book = useBookStore.getState().book;
                          // debugger
                          const listForCheck = getValueByPath(book, props.path);
                          useBookStore.getState().mergeAtPath(props.path, {[getFreeIndex(listForCheck, props.path.at(-2) + '-событие-')]: structEventResult});
                      }}>
                <BsPlusCircle size="24"/>
            </ButtonEx>
            <ButtonEx className={clsx("w-[24px] h-[24px]", CSS_BTN)}
                      title={'Создать события'}
                      onClick={() => {

                          const arr = props.value.value.split('\n')
                          if (Array.isArray(arr)) {
                              arr.forEach(item => {

                                  let _structEventResult = JSON.parse(JSON.stringify(structEventResult));
                                  _structEventResult['Событие'].value = item;

                                  let book = useBookStore.getState().book;
                                  const listForCheck = getValueByPath(book, props.path);
                                  const nameScene = getFreeIndex(listForCheck, props.path.at(-2) + '-событие-') + '';
                                  useBookStore.getState().mergeAtPath(props.path, {[nameScene]: _structEventResult});
                                  // useBookStore.getState().toggleCollapse([...(props.path), nameScene]);
                              })
                          }
                      }}>
                <BsStack size={14}/>
            </ButtonEx>
        </div>}
        {isEvent && <div className="flex flex-row gap-1">
            <Tooltip text={"Количество букв"} direction={"right"} className={clsx(
                'text-gray-500', CSS_BTN)}>
                <InputNumberEditor
                    className={"text-center"}
                    value={props.value.options.numberOfLetters}
                    doInput={(val: number) => {
                        if (isNaN(val)) val = 6;
                        props.toWrite(val, [...(props.path), 'options', 'numberOfLetters']);
                    }}
                />
            </Tooltip>
            <Tooltip text={"Количество символов"} direction={"right"} className={clsx('text-gray-500', CSS_BTN)}>
                [{Math.round(Object.values(props.value)?.[2]?.['value']?.length)}]
            </Tooltip>
        </div>}
        {isSceneHeader && <SceneHeader {...props}/>}
    </>;
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
                className={clsx("w-[24px] h-[24px] hover:!bg-sky-600 hover:text-white transition", CSS_BTN)}
                description="Очистить"
                onConfirm={() => walkAndFilter(props.value, ({key, value, arrPath}) => {
                    key == 'value' && useBookStore.getState().setAtPath(props.path.concat(arrPath), '');
                    return value;
                })}>
                <BsEraserFill size={14}/>
            </ButtonEx>
            {options?.tags?.includes('deletable') && <ButtonEx
                className={clsx("hover:!bg-red-700 hover:text-white transition", CSS_BTN)}
                description="Удалить"
                onConfirm={() => useBookStore.getState().removeAtPath(props.path)}>
                <BsX size="16"/>
            </ButtonEx>}
            {(props.value?.desc || props.value?.example || props.value?.requirements || props.value?.sceneImagePrompt) &&
                <ButtonEx className={clsx('w-[24px] h-[24px]', CSS_BTN,)} onClick={() => {
                    const _path = [...(props.path), 'options', 'forcedIncludes'];
                    useBookStore.getState().setAtPath(_path, props.value?.options?.forcedIncludes ? '' : SET_OPTIONS);
                }}>
                    {props.value?.options?.forcedIncludes ? <BsGearFill size={14}/> : <BsGear size={14}/>}
                </ButtonEx>
            }
        </div>}
    </div>
}