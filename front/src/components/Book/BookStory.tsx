import React, {useCallback, useEffect, useState} from "react";
import BookTreeEditor, {CallbackParams, Clb} from "./BookTreeEditor.tsx";
import {structPlot} from "./mapBook/structPlot.ts";
import TextWrite from "../Auxiliary/TextWrite.tsx";
import clsx from "clsx";
import {isEmpty, isEqualString, walkAndFilter} from "../../lib/utils.ts";
import dataBook from "./data/data.json" with {type: "json"};
import dataImage from "./data/images.json" with {type: "json"};
import {useBookStore, useImageStore} from "./store/storeBook.ts";
import {clbHeader} from "./headers.tsx";
import ButtonEx from "../Auxiliary/ButtonEx.tsx";
import ImageGallery from "../Auxiliary/GalleryImage.tsx";
import {useShallow} from "zustand/react/shallow";

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

    const {book} = useBookStore(useShallow((s) => ({book: s.book})));
    useEffect(() => {
        !book && useBookStore.getState().setAtPath([], structPlot);
    }, [book]);

    const clbEditorValue: Clb = (props) => {
        const {keyName, parent} = props;
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

    const clbContainer: Clb = useCallback((props: CallbackParams) => {
        const {value, parent, keyName, deep, header, children} = props;
        const {options} = value ?? {};

        const isWrap: boolean = Boolean(options?.width);
        const parentWidth = parent?.options?.width;
        const selfWidth: string = options?.selfWidth;
        const isImgGen = isEqualString(options?.tags ?? '', 'image-gen')
        const isImgScene = isEqualString(options?.tags ?? '', 'scene')
        const {isHydrated, images, frame, removeImages} = useImageStore.getState();

        const renderBox = (w?: string) =>
            w && (
                <div
                    className="rounded-[5px] px-2 pt-1 pb-0.5 outline outline-gray-200 -outline-offset-3"
                    style={{width: w}}
                >
                    {header}
                    {children}
                </div>
            );

        let Image = null;

        if (isHydrated && (isImgGen || isImgScene)) {
            const _frames = Object.entries(frame?.[keyName] ?? {});
            const _images = Object.entries(images?.[keyName] ?? {});

            let allImages = _images.map(([, v]) => v);
            let allKeys = _images.map(([k]) => k);

            if (isImgScene) {
                const extras = _frames.flatMap(([_, v]) => {
                    const [name, idx] = String(v).split('.');
                    return ['Персонаж', 'Главный', 'Антогонист', 'Кадр'].some(n => name.includes(n))
                        ? images[name]?.[idx]
                            ? [images[name][idx]]
                            : []
                        : [];
                });
                allImages = [...allImages, ...extras];
                allKeys = [...allKeys, ..._frames.map(([k]) => k)];
            }

            if (allImages.length) {
                Image = (
                    <div className="flex flex-wrap py-1">
                        <ImageGallery
                            images={allImages}
                            onRenderImage={(src, i) => (
                                <div className="relative">
                                    <img className="h-35 object-cover rounded-sm hover:opacity-80 transition"
                                         src={src} alt={`img-${i}`}
                                    />
                                    {_images.some(([, v]) => v === src) && (
                                        <ButtonEx
                                            className="!absolute top-0 right-0 bi-x-lg w-[24px] h-[24px] hover:!bg-red-700 hover:text-white transition"
                                            description="Удалить"
                                            onConfirm={() => removeImages(String(keyName), allKeys[i])}
                                        />
                                    )}
                                </div>
                            )}
                        />
                    </div>
                );
            }
        }

        if (deep === 0) return <div>{children}</div>;
        if (selfWidth) return renderBox(selfWidth);
        if (parentWidth) return renderBox(parentWidth);
        if (isWrap)
            return (
                <>
                    {header}
                    <div className="flex flex-row flex-wrap pl-2 border-l ml-2">{children}</div>
                </>
            );

        return (
            <div className={clsx(LIST_KEY_NAME[keyName] && 'mb-1')}>
                {header}
                <div className="pl-2 border-l ml-2">
                    {Image}
                    {children}
                </div>
            </div>
        );
    }, []);
    return (
        <div className="p-4">

            <div className="mb-3 flex gap-2">
                <ButtonEx className="bi-upload" onClick={() => {
                    useImageStore.getState().setStore(dataImage);
                }}></ButtonEx>
                <ButtonEx className="bi-floppy" onClick={() => {
                    console.log(useImageStore.getState());
                }}></ButtonEx>

                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                        useBookStore.getState().setAtPath([], structPlot);
                    }}
                >
                    Reset store
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                        useBookStore.getState().setAtPath([], dataBook);
                    }}
                >
                    load
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                        console.log(useBookStore.getState().book);
                    }}
                >
                    save
                </button>
                <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {

                        const dataFilteredEmptyVal = walkAndFilter(useBookStore.getState().book,
                            ({parent, key, value}) => {

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

                        walkAndFilter(dataFilteredEmptyVal, ({value, arrPath}) => {
                            if (typeof value != "object") {
                                useBookStore.getState().setAtPath([...arrPath, 'value'], value);
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

            <BookTreeEditor
                clbEditorValue={clbEditorValue}
                clbContainer={clbContainer}
                clbHeader={clbHeader}
            />
            <div className="h-[100vh]"></div>
        </div>
    );
};