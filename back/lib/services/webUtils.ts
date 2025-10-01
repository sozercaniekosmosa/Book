import {domainToASCII} from "node:url";
import net, {Server} from "net";
import axios from "axios";
import isLocalhost from "is-localhost-ip";

export const isAllowHostPort = async (host, port) => {
    try {
        const isLocal = await isLocalhost(domainToASCII(host), true);
        if (isLocal) {
            return new Promise((resolve) => {

                const server: Server = net.createServer();

                server.once('error', function (err: Error) {
                    // @ts-ignore
                    if (err.code == 'EADDRINUSE') {
                        resolve(false)
                    }
                });

                server.once('listening', function () {
                    server.close();
                    resolve(true)
                });

                server.listen(port);
            });
        } else {
            try { // когда поняли что это не локальный хост запрашиваем данные извне
                const {data: isAllow} = await axios.get(`http://${host}:${port}`)
                return isAllow;
            } catch (e) {
                return false;
            }
        }

    } catch (error) {
        if (error?.name === 'AxiosError') throw {status: error.response.status, message: error.message};
        throw error;
    }
};