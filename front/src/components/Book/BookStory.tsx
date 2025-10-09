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
import {clbHeader} from "./headers.tsx";


export const LIST_KEY_NAME = {desc: 'Описание', example: 'Пример', requirements: 'Требования', variants: 'Варианты'};

// forced update browse
// if (+localStorage.getItem('___refresh') < Date.now()) {
//     localStorage.setItem('___refresh', String(Date.now() + 3000));
//     window.location.reload();
// }

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

    const clbContainer: Clb = (props) => {

        const {children, collapsed, deep, header, keyName, parent, path, toWrite, value} = props;
        const isWrap: boolean = Boolean(value?.options?.width);
        const width: string = parent?.options?.width;
        const selfWidth: string = value?.options?.selfWidth;

        if (deep == 0) {
            return <div className="">
                {children}
            </div>
        }

        if (selfWidth) {
            return <div className="-outline-offset-3 outline-1 outline-gray-200 rounded-[5px] px-2 pt-1 pb-0.5"
                        style={{width: selfWidth}}>
                {header}{children}
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