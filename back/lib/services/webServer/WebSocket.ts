import {WebSocketServer} from "ws";

export class WEBSocket {
    arrSubscriber = [];
    activeConnections = [];

    constructor(webServer, {clbAddConnection = null, clbMessage = null, clbClose = null}) {

        const wss = new WebSocketServer({server: webServer})

        wss.on('connection', (ws, req) => {// Слушатель для новых подключений WebSocket

            console.log('Соединение открыто');

            this.activeConnections.push(ws);
            clbAddConnection && clbAddConnection({ws, arrActiveConnection: this.activeConnections});
            this.arrSubscriber.forEach(clbSub => clbSub({
                type: 'connection', ws, arrActiveConnection: this.activeConnections
            }));

            ws.on('message', (mess) => { // Слушатель для входящих сообщений
                try {
                    let host = req.socket.remoteAddress;
                    if (host === '::1') host = 'localhost';

                    clbMessage && clbMessage({ws, arrActiveConnection: this.activeConnections, mess, host})
                    this.arrSubscriber.forEach(clbSub => clbSub({
                        type: 'message', ws, arrActiveConnection: this.activeConnections, mess, host
                    }));

                    console.log(mess)
                    // setTimeout(() =>ws.terminate(), 6000)
                } catch (e) {
                    ws.send(e);
                    console.log(e)
                }
            });
            ws.on('close', () => { // Слушатель для закрытия соединения
                const index = this.activeConnections.indexOf(ws);
                if (index !== -1) {
                    this.activeConnections.splice(index, 1);
                }
                clbClose && clbClose({ws, arrActiveConnection: this.activeConnections})
                this.arrSubscriber.forEach(clbSub => clbSub({
                    type: 'close', ws, arrActiveConnection: this.activeConnections
                }));
                console.log('Соединение закрыто');
            });
        });
    }

    send = (mess) => this.activeConnections.forEach(ws => ws.send(JSON.stringify(mess)))
    getActiveConnections = () => this.activeConnections;
    subscribe = (clb) => {
        this.arrSubscriber.push(clb)
    }
}