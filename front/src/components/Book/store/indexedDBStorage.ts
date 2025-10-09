import { get, set, del } from 'idb-keyval';

export const indexedDBStorage = {
    getItem: async (name: string): Promise<string | null> => {
        try {
            const value = await get(name);
            return value ?? null;
        } catch (error) {
            console.error('IndexedDB get error:', error);
            return null;
        }
    },
    setItem: async (name: string, value: string): Promise<void> => {
        try {
            await set(name, value);
        } catch (error) {
            console.error('IndexedDB set error:', error);
        }
    },
    removeItem: async (name: string): Promise<void> => {
        try {
            await del(name);
        } catch (error) {
            console.error('IndexedDB remove error:', error);
        }
    },
};