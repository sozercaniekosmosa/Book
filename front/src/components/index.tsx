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

    useEffect(() => {
        const socketHandler = ({type, data}) => {
            if (type === 'progress') setProgress(data)
        };

        const localHandler = (({type, data}) => {
            if (type === 'progress') {
                setProgress(parseInt(data))
            }
        });

        eventBus.addEventListener('message-socket', socketHandler);
        eventBus.addEventListener('message-local', localHandler)

        return () => {
            eventBus.removeEventListener('message-socket', socketHandler);
            eventBus.removeEventListener('message-local', localHandler);
        }
    }, [])

    return <div className="flex flex-col h-full">
        {progress >= 0 && <ProgressBar progress={progress}/>}
        <StoryEditor/>
    </div>
}

export default Index