import {create} from "zustand";
import {Path} from "../JSONTreeEditor.tsx";
import {createJSONStorage, persist} from "zustand/middleware";
import {produce} from "immer";
import {indexedDBStorage} from "./indexedDBStorage.ts";


// Enhanced store interface with revision tracking
interface Store {
    json: any;
    collapsed: Record<string, boolean>;
    revision: number; // Добавляем счетчик ревизий для принудительной перерисовки
    setAtPath: (p: Path, v: any) => void;
    mergeAtPath: (p: Path, v: any) => void;
    removeAtPath: (p: Path) => void;
    renameKeyAtPath: (p: Path, v: any) => void;
    toggleCollapse: (p: Path) => void;
    reset: () => void;
    loadFromProp: (d: any) => void;
    forceUpdate: () => void; // Метод для принудительного обновления
    temp: {},
    setTemp: (v: any) => void;
}

/* Helpers */
const pathKey = (p: Path) => JSON.stringify(p || []);

const renameKey = (obj: Record<string, any>, oldKey: string | number, newKey: string | number) => {
    if (obj.hasOwnProperty(oldKey)) {
        obj[newKey] = obj[oldKey];
        delete obj[oldKey];
    }
    return obj;
};

export const pathHandler = (path: (string | number)[]) => {
    return path.join('.').toLocaleLowerCase().replaceAll(/[^a-zA-Zа-яА-Я.]/g, '-');
};

const getObjectByPath = (p: (string | number)[], cur: any) => {
    for (let i = 0; i < p.length - 1; i++) {
        const k = p[i] as any;
        if (cur[k] == null) cur[k] = typeof p[i + 1] === "number" ? [] : {};
        cur = cur[k];
    }
    const k = p[p.length - 1];
    return [cur, k];
};

// Enhanced Zustand store with proper reactivity
export const useJsonStore = create<Store>()(
    persist(
        (set, get) => ({
            json: null,
            collapsed: {},
            revision: 0,
            temp: {},
            setTemp: (v) => set(state => {
                state.temp = {...state.temp, ...v}
                return {
                    revision: state.revision + 1
                };
            }),
            setAtPath: (p, v) => set(state => {
                const base = state.json === null || state.json === undefined
                    ? (typeof p[0] === "number" ? [] : {})
                    : state.json;

                const next = produce(base, (draft: any) => {
                    if (!p || p.length === 0) return v;
                    const [cur, k] = getObjectByPath(p, draft);
                    cur[k] = v;
                });

                return {
                    json: next,
                    revision: state.revision + 1 // Увеличиваем ревизию при каждом изменении
                };
            }),

            mergeAtPath: (p, v) => set(state => {
                const base = state.json === null || state.json === undefined
                    ? (typeof p[0] === "number" ? [] : {})
                    : state.json;

                const next = produce(base, (draft: any) => {
                    if (!p || p.length === 0) return v;
                    const [cur, k] = getObjectByPath(p, draft);
                    cur[k] = {...cur[k], ...v};
                });

                return {
                    json: next,
                    revision: state.revision + 1
                };
            }),

            removeAtPath: (p) => set(state => {
                const base = state.json === null || state.json === undefined
                    ? (typeof p[0] === "number" ? [] : {})
                    : state.json;

                const next = produce(base, (draft: any) => {
                    if (!p || p.length === 0) return;
                    const [cur, k] = getObjectByPath(p, draft);
                    delete cur[k];
                });

                return {
                    json: next,
                    revision: state.revision + 1
                };
            }),

            renameKeyAtPath: (p, newKey) => set(state => {
                const base = state.json === null || state.json === undefined
                    ? (typeof p[0] === "number" ? [] : {})
                    : state.json;

                const oldKey = p[p.length - 1];
                if (oldKey === newKey) return {json: base};

                const next = produce(base, (draft: any) => {
                    if (!p || p.length === 0) return newKey;
                    const [cur] = getObjectByPath(p, draft);
                    renameKey(cur, oldKey, newKey);
                });

                return {
                    json: next,
                    revision: state.revision + 1
                };
            }),

            toggleCollapse: (p) => set(state => ({
                collapsed: {
                    ...(state.collapsed || {}),
                    [pathKey(p)]: !state.collapsed?.[pathKey(p)]
                },
                revision: state.revision + 1 // Увеличиваем ревизию и при сворачивании
            })),

            reset: () => set({
                json: null,
                collapsed: {},
                revision: 0
            }),

            loadFromProp: (d) => set(state => ({
                json: d == null ? null : JSON.parse(JSON.stringify(d)),
                collapsed: {},
                revision: state.revision + 1
            })),

            forceUpdate: () => set(state => ({
                revision: state.revision + 1
            }))
        }),
        {
            name: "story.v2",
            storage: createJSONStorage(() => indexedDBStorage),
            partialize: (s) => ({
                json: s.json,
                collapsed: s.collapsed,
            })
        }
    )
);