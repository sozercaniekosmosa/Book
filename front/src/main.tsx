import {createRoot} from 'react-dom/client'
import './style.css'
import Index from './components/index.tsx'
import glob from "./glob.ts";
import React from "react";
import {ERR, OK} from "./components/PopupMessage/PopupMessage.tsx";
import {webSocket} from "./lib/services.ts";
import {eventBus} from "./lib/events.ts";
import "bootstrap-icons/font/bootstrap-icons.css";

// document.documentElement.classList.add('dark');

glob.hostName = window.location.hostname;
glob.port = 5173;
glob.hostAPI = `http://${glob.hostName}:${glob.port}/api/v1/`;
glob.wsHostName = glob.hostName;
glob.wsPort = '3000';

let nodeRoot = document.getElementById('root');
createRoot(nodeRoot!).render(
    // <StrictMode>
    <Index/>
    // </StrictMode>,
)

nodeRoot.addEventListener('dblclick', () => {
    glob.selectedText = undefined;
})
nodeRoot.addEventListener('mouseup', () => {
    const text = window.getSelection().toString()
    glob.selectedText = text.length ? text.trim() : null;
    // console.log(text)
})

document.addEventListener('paste', function (e) {
    // @ts-ignore
    var text = (e.clipboardData || window.clipboardData).getData('text');
    glob.clipboardText = text;
    // console.log('Clipboard text:' + text);
});

//веб-сокет для обмена данными с сервером
async function createMessageSocket() {
    try {
        webSocket({
            hostName: glob.wsHostName, port: glob.wsPort, timeReconnect: 1500,
            clbOpen: () => {
                eventBus.dispatchEvent('connect-to-srv');
                OK('Связь с сервером восстановлена')
            },
            clbMessage: ({data: mess}) => {
                // console.log("Получены данные: " + mess);
                const {type, data} = JSON.parse(mess);
                eventBus.dispatchEvent('message-socket', {type, data})
            },
            clbError: () => ERR('Нет связи с сервером')
        })
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        // setTimeout(() => messageSocket(nui), 2000);
    }
}

await createMessageSocket();