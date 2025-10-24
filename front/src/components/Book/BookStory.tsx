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
import Modal from "../Auxiliary/ModalWindow.tsx";
import Dialog from "../Auxiliary/Dialog.tsx";
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

    const [openModal, setOpenModal] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [_val, set_val] = useState<any>('');

    const {book} = useBookStore(useShallow((s) => ({book: s.book})));
    useEffect(() => {
        !book && useBookStore.getState().setAtPath([], structPlot);
    }, [book]);

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

    const clbContainer: Clb = useCallback((props: CallbackParams) => {
        const isWrap: boolean = Boolean(props.value?.options?.width);
        const width: string = props.parent?.options?.width;
        const selfWidth: string = props.value?.options?.selfWidth;

        if (isEqualString(props.value?.options?.tags ?? '', 'image-gen')) {
            const arrImgBase64 = useImageStore.getState().images?.[props.keyName];

            return <div className={clsx(LIST_KEY_NAME[props.keyName] && 'mb-1')}>
                {props.header}
                <div className={clsx('pl-2 border-l ml-2 ')}>
                    <div className={clsx('flex flex-wrap')}>
                        {arrImgBase64?.length > 0 && <div className="py-1">
                            <ImageGallery
                                images={arrImgBase64}
                                onRenderImage={(src, index) => (
                                    <div className="relative">
                                        <img
                                            src={src}
                                            alt={`custom-${index}`}
                                            className="h-35 object-cover rounded-sm hover:opacity-80 transition"
                                        />
                                        <ButtonEx
                                            className="!absolute top-0 right-0 bi-x-lg w-[24px] h-[24px] hover:!bg-red-700 hover:text-white transition"
                                            description="Удалить"
                                            onConfirm={() => {
                                                useImageStore.getState().removeImages(props.keyName + '', index)
                                            }}/>
                                    </div>
                                )}
                            />
                        </div>}
                    </div>
                    {props.children}
                </div>
            </div>
        }

        if (props.deep == 0) {
            return <div className="">
                {props.children}
            </div>
        }

        if (selfWidth) {
            return <div className="-outline-offset-3 outline-1 outline-gray-200 rounded-[5px] px-2 pt-1 pb-0.5"
                        style={{width: selfWidth}}>
                {props.header}{props.children}
            </div>
        }

        if (isWrap) {
            return <>
                {props.header}
                <div className="flex flex-row flex-wrap pl-2 border-l ml-2">
                    {props.children}
                </div>
            </>
        }

        if (width) {
            return <div className="-outline-offset-3 outline-1 outline-gray-200 rounded-[5px] px-2 pt-1 pb-0.5"
                        style={{width}}>
                {props.header}{props.children}
            </div>
        }


        return <div className={clsx(LIST_KEY_NAME[props.keyName] && 'mb-1')}>
            {props.header}
            <div className={clsx(
                "pl-2 border-l ml-2"
            )}>
                {props.children}
            </div>
        </div>

        // return null;
    }, []);
    return (
        <div className="p-4">

            <div className="mb-3 flex gap-2">
                <ButtonEx className="bi-gear" onClick={() => {
                    // useImageStore.getState().addImages('Главный герой', '!!!!!')
                    // setOpenModal(true);
                }}></ButtonEx>

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

            <div className="flex flex-wrap">
                {openModal && <Modal show={openModal} onHide={() => setOpenConfirm(true)} autoSize={false}>
                    <Modal.Header>
                        <Modal.Title className="text-sm">Сюжет</Modal.Title>
                    </Modal.Header>

                    {/*<TextWrite*/}
                    {/*    className="text-black !w-[50vw] h-[40vh] overflow-y-scroll !leading-normal"*/}
                    {/*    value={_val}*/}
                    {/*    onChange={(e) => set_val(e.target.value)}*/}
                    {/*    onBlur={() => setOpenConfirm(true)}*/}
                    {/*    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {*/}
                    {/*        if (e.key === "Enter" && e.ctrlKey) {*/}
                    {/*            // useBookStore.getState().setAtPath([...path, 'value'], _val);*/}
                    {/*            (e.target as HTMLInputElement).blur();*/}
                    {/*        }*/}
                    {/*    }}*/}
                    {/*    placeholder={value.desc}*/}
                    {/*/>*/}
                </Modal>}
                <Dialog
                    title="Сохрание" message="Уверены?"
                    show={openConfirm} setShow={setOpenConfirm}
                    onConfirm={() => {
                        // useBookStore.getState().setAtPath([...path, 'value'], _val);
                        setOpenModal(false);
                    }}
                    onUnconfirm={() => setOpenModal(false)}
                    props={{className: 'modal-sm'}}>
                </Dialog>
            </div>


            <div className="h-[100vh]"></div>
        </div>
    );
};