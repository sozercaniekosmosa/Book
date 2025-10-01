import axios from "axios";

export const checkEndpointAvailability = async (hostAPI: string, chekingUrl: string) => {
    try {
        return await axios.get(hostAPI + 'exist-endpoint', {params: {url: chekingUrl}});
    } catch (error) {
        return false;
    }
};

let _old = 0;
let _isPortInUse;
let old = 0;

export async function isAllowHostPort(hostAPI, host, port, id) {
    try {

        old++;
        let isPortInUse = await axios.get(hostAPI + `is-allow-host-port/${host}/${port}/${id}`)

        //эта часть нужна на случай когда на сервер отправлено несколько запросов, нужно оставить только самый последний
        if (old == _old) isPortInUse = _isPortInUse; // если вернулся ответ сервера от более раннего запроса ответ игнорируем
        _isPortInUse = isPortInUse;
        _old = old;

        return isPortInUse;
    } catch (error) {
        console.error(`Ошибка проверки порта: ${port}`, error);
    }
}