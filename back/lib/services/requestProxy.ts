import randUserAgent from "random-useragent";
import {HttpsProxyAgent} from "https-proxy-agent";
import axios from "axios";

function getUserAgent() {
    return randUserAgent.getRandom()
}

export class Requester {
    indexProxy = -1;
    arrQueue = [];
    arrCfgProxy = [];
    maxReqPerProxyUrl;
    maxReqPerHost;
    timeRelax;

    constructor(strProxy, {maxReqPerProxyUrl = 10, maxReqPerHost = 3, timeRelax = 1000} = {}) {
        this.maxReqPerProxyUrl = maxReqPerProxyUrl;
        this.maxReqPerHost = maxReqPerHost;
        this.timeRelax = timeRelax;

        this.arrCfgProxy = strProxy.split('\n').map(it => {
            const [host, port, user, pass] = it.split(':')
            const proxyUrl = `http://${user}:${pass}@${host}:${port}`
            const userAgent = getUserAgent();
            const httpsAgent = new HttpsProxyAgent(proxyUrl);

            return {
                httpsAgent, userAgent, listHosts: {}, doneReq: 0, timeRelax: 0
            }
        });
        this.arrCfgProxy.push({httpsAgent: null, userAgent: getUserAgent(), listHosts: {}, doneReq: 0, timeRelax: 0})
    }

    async getUrl(url) {
        if (this.arrCfgProxy.length === 0) return; //прокси вообще есть?

        let currUrl = url; //
        if (this.arrQueue.length !== 0) { //если в очереди есть не обработанные запросы
            this.arrQueue.push(url) // текущий запрпос сразу в помещаем в очередь
            currUrl = this.arrQueue.shift(); //достаем самый ранний запрос и делаем его текущим
        }
        for (let i = 0; i < this.arrCfgProxy.length; i++) {
            //берем следующий (не начинаем с первого для баланса)
            this.indexProxy = this.arrCfgProxy.length <= this.indexProxy || this.indexProxy < 0 ? 0 : ++this.indexProxy;
            const cfgProxy = this.arrCfgProxy[this.indexProxy];
            const {httpsAgent, userAgent, listHosts, doneReq, timeRelax} = cfgProxy;


            if (timeRelax < (new Date()).getMilliseconds()) cfgProxy.timeRelax = 0;// если прокси отдохнул
            if (timeRelax > 0) continue // если прокси отдыхает -> берем следующий
            if (doneReq > this.maxReqPerProxyUrl) { // если превысили лимит, делаем отдых для прокси и берем следующий
                cfgProxy.doneReq = 0; // сбрасываем лимиттер
                cfgProxy.timeRelax = (new Date()).getMilliseconds() + this.timeRelax
                continue
            }


            const host = (new URL(currUrl)).host; //берем host из url
            if (currUrl in listHosts) {//если мы уже работаем с этим хостом
                if (listHosts[host] > this.maxReqPerHost) continue; //и если для этого прокси лимит по хосту превышен берем другой
            } else {
                listHosts[host] = 0;
            }

            listHosts[host]++; // увеличиваем
            cfgProxy.doneReq++; // увеличиваем

            let data;

            try {
                ({data} = await axios.create({httpsAgent}).get(url, {headers: {"User-Agent": userAgent}}));
            } catch (e) {
                cfgProxy.doneReq--; // уменьшаем
                continue;
            } finally {
                listHosts[host]--; // уменьшаем
            }

            return data;
        }
        this.arrQueue.push(currUrl)
    }
}