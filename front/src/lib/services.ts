export function webSocket({
                              hostName,
                              port,
                              protocol = 'json',
                              clbOpen = null,
                              clbMessage = null,
                              clbClose = null,
                              clbError = null,
                              timeReconnect = 1000
                          }) {

    let isConnected = false;
    const reconnect = (param) => {
        if (isConnected) return;
        isConnected = true;
        setTimeout(() => {
            isConnected = false;
            console.log('попытка соединения с сервером ...')
            _webSocket(param)
        }, timeReconnect);
    }

    function _webSocket(param) {
        const ws = new WebSocket(`ws://${hostName}:${port}`, protocol) as WebSocket;


        ws.onopen = () => {
            isConnected = false;
            try {
                if (clbOpen) {
                    const objSend = clbOpen();
                    if (objSend) {
                        ws.send(objSend);
                    }
                }
                console.log('WebSocket соединение открыто')
            } catch (e) {
                // console.log(e)
            }
        };
        ws.onmessage = (message) => {
            try {
                clbMessage && clbMessage(message);
            } catch (e) {
                // console.log(e)
            }
        };

        ws.onclose = (ev) => {
            try {
                clbClose && clbClose(ev);
                console.log('WebSocket соединение закрыто')
                // ws.terminate()
            } catch (e) {
                // console.log(e)
            } finally {
                reconnect(arguments);
            }
        };
        ws.onerror = err => {
            // console.log(err)
            return clbError && clbError(err);
        };

        return ws
    }

    return _webSocket(arguments);
}
