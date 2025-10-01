//How to use
// const storage = new IndexedDBStorage('myDB', 'myStore');
// storage.set('myKey', 'myValue').then(() => {
//      storage.get('myKey').then(console.log);  // Выведет: 'myValue'
// });
export class IndexedDBStorage {
    private dbName: string;
    private storeName: string;

    constructor(dbName, storeName) {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                // @ts-ignore
                const db = event.target.result;
                db.createObjectStore(this.storeName);
            };
        });
    }

    async get(key) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            // @ts-ignore
            const transaction = db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async set(key, value) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            // @ts-ignore
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(value, key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
}

export function getCookie(name: string) {
    let matches = document.cookie.match(new RegExp(
        '(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}