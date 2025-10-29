import React, {UIEventHandler, useEffect, useRef, useState} from 'react'
import './style.css'
import ProgressBar from './ProgressBar/ProgressBar';
import {eventBus} from "../lib/events.ts";
import ButtonEx from "./Auxiliary/ButtonEx.tsx";
import {Tab, Tabs} from './Auxiliary/Tabs.tsx';

import {ERR, LOG, OK, WARN} from "./PopupMessage/PopupMessage.tsx";
import Group from "./Auxiliary/Group.tsx";
import {StoryEditor} from "./Book/BookStory.tsx";
import {useBookStore, useTempStore} from "./Book/store/storeBook.ts";
import {useShallow} from "zustand/react/shallow";

function Index() {
    const [progress, setProgress] = useState(0)

    const refStoryEditor = useRef();

    // @ts-ignore
    const {setValue} = useTempStore(useShallow((s) => ({setValue: s.setValue})));

    useEffect(() => {

        // @ts-ignore
        setTimeout(() => refStoryEditor?.current?.scrollTo?.(0, useTempStore.getState().yScroll), 800);

        const socketHandler = ({type, data}) => {
            if (type === 'progress') setProgress(data)
        };

        const localHandler = (({type, data}) => {
            if (type === 'progress') {
                setProgress(parseInt(data))
            }
        });

        // @ts-ignore
        eventBus.addEventListener('set-scroll-top', () => {
            // @ts-ignore
            refStoryEditor.current.scrollTop = useBookStore.getState().temp.scrollTop;
        });

        eventBus.addEventListener('message-socket', socketHandler);
        eventBus.addEventListener('message-local', localHandler)

        return () => {
            eventBus.removeEventListener('message-socket', socketHandler);
            eventBus.removeEventListener('message-local', localHandler);
        }
    }, [])

    return (
        <div className="flex flex-col h-full">
            <div id="modalPortal" style={{
                display: 'contents',
                position: 'absolute',
                left: '0',
                top: '0',
                width: '100vw',
                height: '100vh',
            }}></div>
            {progress >= 0 && <ProgressBar progress={progress}/>}
            <Tabs defaultActiveKey="storybook" className="mb-1 h-full">

                <Tab eventKey="storybook" title="storybook" className="">
                    <div className="h-full p-1 text-[14px] overflow-y-scroll" ref={refStoryEditor}
                         onScroll={(e: any) => setValue('yScroll', e.target.scrollTop)}>
                        <StoryEditor/>
                    </div>
                </Tab>

                <Tab eventKey="aux" title="aux" style={{flex: 1}} className="h-full">
                    <div className="flex flex-col h-full w-100 m-1">
                        <h6>Кнопки button-spinner:</h6>
                        <div className="flex flex-wrap flex-row gap-1">
                            <ButtonEx className="btn btn-secondary" onAction={(a) => {
                                console.log(a)
                            }}>Кнопка-спиннер</ButtonEx>
                            <ButtonEx className="btn btn-secondary" onConfirm={(a) => {
                                console.log(a)
                            }} description="Выполнить действие">Кнопка-запрос</ButtonEx>
                        </div>
                        <hr/>
                        <h6>Всплывающие сообщения:</h6>
                        <div className="flex flex-wrap flex-row gap-1">
                            <ButtonEx className="btn btn-success" onClick={() => OK(new Date())}> OK</ButtonEx>
                            <ButtonEx className="btn btn-secondary" onClick={() => LOG(new Date())}>LOG</ButtonEx>
                            <ButtonEx className="btn btn-warning" onClick={() => WARN(new Date())}>WARN</ButtonEx>
                            <ButtonEx className="btn btn-danger" onClick={() => ERR(new Date())}>ERR</ButtonEx>
                        </div>
                        <hr/>
                        <h6>Список с перетаскиванием:</h6>
                        <hr/>
                        <h6>Шакала:</h6>
                        <Group className="m-1">
                            <ButtonEx className="btn btn-primary" onClick={() => setProgress(0)}>0%</ButtonEx>
                            <ButtonEx className="btn btn-primary" onClick={() => setProgress(25)}>25%</ButtonEx>
                            <ButtonEx className="btn btn-primary" onClick={() => setProgress(50)}>50%</ButtonEx>
                            <ButtonEx className="btn btn-primary" onClick={() => setProgress(75)}>75%</ButtonEx>
                            <ButtonEx className="btn btn-primary" onClick={() => setProgress(100)}>100%</ButtonEx>
                        </Group>
                        <hr/>
                    </div>
                </Tab>
                <Tab eventKey="test" title="test" style={{flex: 1}}>
                    {/*<TodoList></TodoList>*/}
                </Tab>
            </Tabs>
            {/*<PopupMessage/>*/}
        </div>
    )
}

export default Index