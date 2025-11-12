import {create} from "zustand";
import {Path} from "../BookTreeEditor.tsx";
import {createJSONStorage, persist} from "zustand/middleware";
import {produce} from "immer";
import {indexedDBStorage} from "./indexedDBStorage.ts";
import {immer} from "zustand/middleware/immer";
import {convertBase64ImageFormat} from "../general.utils.ts";
import {getID} from "../../../lib/utils.ts";


// Enhanced store interface with revision tracking
interface StoreBook {
    revision: number;
    forceUpdate: () => void; // Метод для принудительного обновления
    book: any;
    collapsed: Record<string, boolean>;
    setAtPath: (p: Path, v: any) => void;
    mergeAtPath: (p: Path, v: any) => void;
    removeAtPath: (p: Path) => void;
    renameKeyAtPath: (p: Path, v: any) => void;
    toggleCollapse: (p: Path) => void;
    reset: () => void;
    loadFromProp: (d: any) => void;
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

export const useBookStore = create<StoreBook>()(
    persist(
        (set, get) => ({
            book: null,
            collapsed: {},
            revision: 0,
            temp: {},
            setTemp: (v) => set(state => {
                state.temp = {...state.temp, ...v}

                // return {
                //     revision: state.revision + 1
                // };

                return state.temp;
            }),
            setAtPath: (p, v) => set(state => {
                const base = state.book === null || state.book === undefined
                    ? (typeof p[0] === "number" ? [] : {})
                    : state.book;

                const next = produce(base, (draft: any) => {
                    if (!p || p.length === 0) return v;
                    const [cur, k] = getObjectByPath(p, draft);
                    cur[k] = v;
                });

                return {
                    book: next,
                    revision: state.revision + 1 // Увеличиваем ревизию при каждом изменении
                };
            }),

            mergeAtPath: (p, v) => set(state => {
                const base = state.book === null || state.book === undefined
                    ? (typeof p[0] === "number" ? [] : {})
                    : state.book;

                const next = produce(base, (draft: any) => {
                    if (!p || p.length === 0) return v;
                    const [cur, k] = getObjectByPath(p, draft);
                    cur[k] = {...cur[k], ...v};
                });

                return {
                    book: next,
                    revision: state.revision + 1
                };
            }),

            removeAtPath: (p) => set(state => {
                const base = state.book === null || state.book === undefined
                    ? (typeof p[0] === "number" ? [] : {})
                    : state.book;

                const next = produce(base, (draft: any) => {
                    if (!p || p.length === 0) return;
                    const [cur, k] = getObjectByPath(p, draft);
                    delete cur[k];
                });

                return {
                    book: next,
                    revision: state.revision + 1
                };
            }),

            renameKeyAtPath: (p, newKey) => set(state => {
                const base = state.book === null || state.book === undefined
                    ? (typeof p[0] === "number" ? [] : {})
                    : state.book;

                const oldKey = p[p.length - 1];
                if (oldKey === newKey) return {book: base};

                const next = produce(base, (draft: any) => {
                    if (!p || p.length === 0) return newKey;
                    const [cur] = getObjectByPath(p, draft);
                    renameKey(cur, oldKey, newKey);
                });

                return {
                    book: next,
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
                book: null,
                collapsed: {},
                revision: 0
            }),

            loadFromProp: (d) => set(state => ({
                book: d == null ? null : JSON.parse(JSON.stringify(d)),
                collapsed: {},
                revision: state.revision + 1
            })),

            forceUpdate: () => set(state => ({
                revision: state.revision + 1
            }))
        }),
        {
            name: "story",
            // storage: createJSONStorage(() => indexedDBStorage),
            partialize: (s) => ({
                isHydrated: false,
                temp: s.temp,
                book: s.book,
                collapsed: s.collapsed,
            })
        }
    )
);

export interface StoreImage {
    isHydrated: boolean; //флаг гидрирования
    revision: number;
    forceUpdate: () => void; // Метод для принудительного обновления

    images: Record<string, string[]>;
    addImages: (id: string, imageBase64: string) => Promise<string>;
    removeImages: (id: string, index: string) => void;

    frame: Record<string, string[]>;
    setFrame: (id: string, val: string) => void;
    removeFrame: (id: string, val: string) => void;

    removeAll: () => void;

    setStore: (store: any) => void;
}


export const useImageStore = create<StoreImage>()(
    persist(immer(
            (set, get) => ({
                isHydrated: false,
                revision: 0,
                images: {},
                frame: {},
                addImages: async (id, imageBase64) => {

                    const imgBase64 = await convertBase64ImageFormat(imageBase64, 'image/webp', 'white');

                    let idImage = 'i' + getID();
                    set(state => {
                        state.images[id] = {...state.images[id], [idImage]: imgBase64}
                    });

                    return idImage;
                },
                removeImages: (id, idImage) => set(state => {
                    // state.images[id].splice(index, 1);
                    delete state.images[id][idImage];
                }),

                setFrame: (id, val) => {
                    set(state => {
                        let frame = state?.frame[id] ?? [];
                        if (!frame?.includes(val)) state.frame[id] = [...frame, val];
                    });
                },
                removeFrame: (id, idImg) => {
                    set(state => {
                        if (state?.frame?.[id]?.[idImg]) {
                            delete state.frame[id][idImg];
                        } else if (Array.isArray(state?.frame?.[id])) {
                            state.frame[id] = state.frame[id].filter(it => it != idImg);
                        }
                    });
                },

                setStore: (store) => set(state => {
                    return {...state, ...store};
                }),
                forceUpdate: () => set(state => ({
                    revision: state.revision + 1
                })),
                removeAll: () => set(state => ({
                    revision: 0,
                    images: {},
                    frame: {},
                }))
            })),
        {
            name: "images",
            storage: createJSONStorage(() => indexedDBStorage),
            partialize: (s) => ({
                images: s.images,
                frame: s.frame,
            }),
            onRehydrateStorage: () => (state, error) => {
                if (!error) {
                    setTimeout(() => {
                        useImageStore.setState({isHydrated: true});
                    }, 200);
                }
            },
        }
    )
);

export interface StoreTemp {
    setValue: (key: string, value: any) => void;
}

export const useTempStore = create<StoreTemp>()(
    persist(immer(
            (set, get) => ({
                setValue: (key: string, value: any) => set(state => {
                    state[key] = value;
                }),
            })),
        {
            name: "temp"
        }
    )
);

// @ts-ignore
window.useTempStore = useTempStore;