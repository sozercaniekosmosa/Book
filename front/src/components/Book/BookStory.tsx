import React, {useCallback, useEffect, useRef, useState} from "react";
import BookTreeEditor, {CallbackParams, Clb} from "./BookTreeEditor.tsx";
import {structPlot} from "./mapBook/structPlot.ts";
import TextWrite from "../Auxiliary/TextWrite.tsx";
import clsx from "clsx";
import {isEqualString, walkAndFilter} from "../../lib/utils.ts";
import {useBookStore, useImageStore, useTempStore} from "./store/storeBook.ts";
import {clbHeader} from "./headers.tsx";
import ButtonEx from "../Auxiliary/ButtonEx.tsx";
import ImageGallery from "../Auxiliary/GalleryImage.tsx";
import {useShallow} from "zustand/react/shallow";
import {BiReset, BiSave} from "react-icons/bi";
import {BsLightningCharge, BsX} from "react-icons/bs";
import Modal from "../Auxiliary/ModalWindow.tsx";
import {Tab, Tabs} from "../Auxiliary/Tabs.tsx";
import {eventBus} from "../../lib/events.ts";
import {RiFlowerFill} from "react-icons/ri";
import saveFile from "../../lib/fs.ts";
import JSZip from "jszip";
import {FaRegFolder} from "react-icons/fa";

export const LIST_KEY_NAME = {
    desc: 'Описание',
    example: 'Пример',
    requirements: 'Требования',
    variants: 'Варианты',
    sceneImagePrompt: 'Промпт для сцены'
};

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
                          }
                      }}
                      className={className}
    />;
};


export const StoryEditor: React.FC = () => {

    const [isEvents, setIsEvents] = useState(false);
    const refEventContent = useRef(null);
    const refStoryEditor = useRef();

    const {book} = useBookStore(useShallow((s) => ({book: s.book})));
    useEffect(() => {
        !book && useBookStore.getState().setAtPath([], structPlot);
    }, [book]);

    // @ts-ignore
    const {setValue} = useTempStore(useShallow((s) => ({setValue: s.setValue})));

    useEffect(() => {
        // @ts-ignore
        setTimeout(() => refStoryEditor?.current?.scrollTo?.(0, useTempStore.getState().yScroll), 800);

        eventBus.addEventListener('set-scroll-top', () => {
            // @ts-ignore
            refStoryEditor.current.scrollTop = useBookStore.getState().temp.scrollTop;
        });
    }, [])

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
        const isImgGen = isEqualString(options?.tags ?? '', 'image-gen');
        const isImgScene = isEqualString(options?.tags ?? '', 'scene');
        const isEvent = isEqualString(options?.tags ?? '', 'nowrap');
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

        if (isEvent) return <div>
            {header}
            {children}
        </div>;

        if (isHydrated && (isImgGen || isImgScene)) {
            const _frames = Object.entries(frame?.[keyName] ?? {});
            const _images = Object.entries(images?.[keyName] ?? {});

            let allImages = _images.map(([, v]) => v);
            let allKeys = _images.map(([k]) => k);

            if (isImgScene) {
                const extras = _frames.flatMap(([_, v]) => {
                    const [name, idx] = String(v).split('.');
                    return ['Персонаж', 'Главный', 'Антагонист', 'Кадр'].some(n => name.includes(n))
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
                                            className="!absolute top-0 right-0 w-[24px] h-[24px] hover:!bg-red-700 hover:text-white transition"
                                            description="Удалить"
                                            onConfirm={() => removeImages(String(keyName), allKeys[i])}
                                        ><BsX size="24"/></ButtonEx>
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
    return (<>
        <div className="flex gap-2">
            <ButtonEx className="w-[24px] h-[24px]"
                      onConfirm={() => {
                          useBookStore.getState().setAtPath([], structPlot);
                          useImageStore.getState().removeAll();
                      }}
                      description="Очистить"><BiReset/></ButtonEx>
            <ButtonEx className="w-[24px] h-[24px]"
                      typeFiles=".book"
                      onUpload={(file) => {
                          // useBookStore.getState().setAtPath([], dataBook);
                          const zip = new JSZip();
                          zip.loadAsync(file)
                              .then(async function (zip) {
                                  const jsonBook = await zip.file("book").async("string"); // a promise of "Hello World\n"
                                  const jsonImages = await zip.file("images").async("string"); // a promise of "Hello World\n"
                                  useBookStore.getState().setAtPath([], JSON.parse(jsonBook));
                                  useImageStore.getState().setStore(JSON.parse(jsonImages));
                              });
                      }}
            ><FaRegFolder/></ButtonEx>
            <ButtonEx className="w-[24px] h-[24px]"
                      typeFiles=".book"
                      onClick={() => {
                          // saveTextAsFile(useBookStore.getState().book, 'book.json');
                          console.log(useBookStore.getState().book);

                          const zip = new JSZip();
                          const bookName = useBookStore.getState().book['Общие']['Название'].value
                          zip.file('book', JSON.stringify(useBookStore.getState().book));
                          zip.file('images', JSON.stringify(useImageStore.getState()));

                          zip.generateAsync({type: 'blob'}).then(async content => {
                              await saveFile(await content.arrayBuffer(), bookName + '.book', 'book');
                          });
                      }}><BiSave/></ButtonEx>
            <ButtonEx className="w-[24px] h-[24px]"
                      onClick={() => {
                          const book = useBookStore.getState().book;
                          let arrRes = [];
                          walkAndFilter(book,
                              ({parent, key, value}) => {
                                  if (value?.options?.tags?.includes('plot-arc-item')) {
                                      arrRes.push('')
                                      arrRes.push(key + ':plot-arc-item')
                                  }
                                  if (value?.options?.tags?.includes('scene')) {
                                      const nameScene = value?.['Название кратко'].value + ':scene';
                                      arrRes.push(nameScene)
                                      const event = value?.['События'].value;
                                      arrRes.push(event)
                                  }
                                  return value;
                              })
                          refEventContent.current = arrRes;
                          setIsEvents(true);
                      }}
            >
                <BsLightningCharge/>
            </ButtonEx>

            {isEvents ? <Modal show={isEvents} onHide={() => setIsEvents(false)} autoSize={false} className="w-[90%]">
                <Modal.Header>
                    <Modal.Title className="h6">События</Modal.Title>
                </Modal.Header>
                <Modal.Body
                    className="py-4 leading-[1.1em] text-[14px] text-gray-600">{refEventContent.current.map((it, i) => {
                    if (it.includes(':plot-arc-item'))
                        return <div className="pt-2 justify-center items-center flex flex-row gap-2" key={i}>
                            <RiFlowerFill size="12" className="rotate-315"/><p
                            className="text-center font-bold">{it.replaceAll(':plot-arc-item', '')}</p><RiFlowerFill
                            size="12" className="rotate-45"/></div>
                    if (it.includes(':scene'))
                        return <p className="pt-2 font-bold" key={i}>{it.replaceAll(':scene', '')}</p>

                    return <pre className="w-full whitespace-break-spaces" key={i}>{it}</pre>

                })}</Modal.Body>
            </Modal> : ''}

        </div>
        <Tabs defaultActiveKey="storybook" className="mb-1 h-full">
            <Tab eventKey="storybook" title="Книга" className="">
                <div className="h-full p-1 text-[14px] overflow-y-scroll" ref={refStoryEditor}
                     onScroll={(e: any) => setValue('yScroll', e.target.scrollTop)}>
                    <div className="p-4">
                        <BookTreeEditor
                            clbEditorValue={clbEditorValue}
                            clbContainer={clbContainer}
                            clbHeader={clbHeader}
                        />
                        <div className="h-[50vh]"></div>
                    </div>
                </div>
            </Tab>
            <Tab eventKey="events" title="События" className="">
            </Tab>
        </Tabs>
    </>);
};