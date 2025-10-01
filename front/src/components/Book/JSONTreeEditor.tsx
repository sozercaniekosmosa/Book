import React, {useCallback, useEffect, useMemo, useState} from "react";
import {create} from "zustand";
import {persist} from "zustand/middleware";
import {produce} from "immer";
import clsx from "clsx";
import {useShallow} from "zustand/react/shallow";

export type Path = (string | number)[];
type PathKey = string;

export type CallbackParams = {
    toWrite: (value: any, p?: Path) => void;
    toSwitch: () => void;
    parent: any;
    keyName: string | number | null;
    value: any;
    path: Path;
    deep: number;
    children?: React.ReactNode;
    header?: React.ReactNode;
    collapsed?: boolean;
};

export type Clb<T = CallbackParams> = (p: T) => React.ReactElement | null | undefined;

interface Props {
    jsonData?: any;
    clbEditorValue?: Clb;
    clbContainer?: Clb;
    clbHeader?: Clb;
    nameFieldOptions?: string;
}

// Node props
type NodeProps = {
    pKey: PathKey;
    keyName: string | number | null;
    deep: number;
    clbEditorValue?: Clb;
    clbContainer?: Clb;
    clbHeader?: Clb;
};

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

let _nfo: string;

/* Helpers */
const pathKey = (p: Path) => JSON.stringify(p || []);

const getAt = (root: any, p: Path) => {
    if (!p || p.length === 0) return root;
    let cur = root;
    for (let i = 0; i < p.length; i++) {
        if (cur == null) return undefined;
        cur = cur[p[i] as any];
    }
    return cur;
};

const tryParse = (s: string) => {
    try {
        return JSON.parse(s);
    } catch {
        return s;
    }
};

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
            partialize: (s) => ({
                json: s.json,
                collapsed: s.collapsed,
            })
        }
    )
);

//@ts-ignore
window.useJsonStore = useJsonStore;

// Default components
export const DefaultIcon: React.FC<{ collapse: boolean }> = ({collapse}) => (
    <div className={clsx("transform transition-transform duration-150", collapse ? "rotate-90" : "rotate-180")}>
        <div className={clsx(
            "w-0 h-0",
            "border-b-[10px] border-l-[5px] border-r-[5px]",
            "border-b-black border-l-transparent border-r-transparent"
        )}/>
    </div>
);

const DefaultKey: React.FC<{ k: string | number | null }> = ({k}) => (
    <span className="mr-2 font-medium">{k == null ? "(root)" : String(k)}</span>
);

const DefaultContainer: React.FC<{ children?: React.ReactNode }> = ({children}) => (
    <div className="pl-2 border-l ml-2">{children}</div>
);

const DefaultInput: React.FC<{
    keyName: string;
    value: any;
    onCommit: (v: any) => void
}> = ({keyName, value, onCommit}) => {
    const [t, setT] = useState(() => (typeof value === "string" ? value : JSON.stringify(value)));

    useEffect(() => {
        setT(typeof value === "string" ? value : JSON.stringify(value));
    }, [value]);

    const commit = () => onCommit(tryParse(t));

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <input
            className={clsx("border rounded-[2px] px-1")}
            value={t}
            onChange={e => setT(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            aria-label={`Edit ${keyName}`}
        />
    );
};

// Enhanced Node component with better reactivity
const NodeInner: React.FC<NodeProps> = ({
                                            pKey,
                                            keyName,
                                            deep,
                                            clbEditorValue,
                                            clbContainer,
                                            clbHeader
                                        }) => {
    if (keyName == _nfo) return null;

    const path = useMemo(() => JSON.parse(pKey) as Path, [pKey]);

    // Подписываемся на конкретные части стора с помощью useShallow
    const {value, collapsed, revision} = useJsonStore(useShallow(s => ({
        value: getAt(s.json, path),
        collapsed: !!s.collapsed[pKey],
        revision: s.revision // Подписываемся на ревизию для принудительных обновлений
    })));

    const {setAt, toggle} = useJsonStore(useShallow(s => ({
        setAt: s.setAtPath,
        toggle: s.toggleCollapse,
    })));

    const parent = useMemo(() => {
        const state = useJsonStore.getState();
        return getAt(state.json, path.slice(0, -1));
    }, [path, revision]); // Добавляем revision в зависимости

    const options = useMemo(() => parent?.[_nfo] ?? {}, [parent]);
    const {includes, excludes, forcedIncludes} = options;

    // Фильтрация на основе опций

    const isForcedIncludes = forcedIncludes && forcedIncludes?.includes(keyName) // Если нет принудительного включения

    if (!isForcedIncludes && includes && !includes?.includes(keyName)) return null;
    if (!isForcedIncludes && excludes && excludes?.includes(keyName)) return null;


    const toWrite = useCallback((v: any, p?: Path) => {
        setAt(p && p.length ? p : path, v);
    }, [setAt, path]);

    const toSwitch = useCallback((arrPath: []) => {
        toggle(arrPath ?? path);
    }, [toggle, path]);

    const baseParams = {
        toWrite,
        toSwitch,
        parent,
        keyName,
        value,
        path,
        deep,
        children: null,
        collapsed,
    } as CallbackParams;

    // Обработка объектов и массивов
    if (value !== null && typeof value === "object") {
        const entries = Array.isArray(value)
            ? (value as any[]).map((vv, i) => [i, vv] as [number, any])
            : Object.entries(value);

        const header = clbHeader ? clbHeader(baseParams) : (
            <div className="flex items-center gap-2">
                {!value?.[_nfo]?.excludes?.includes('toggle') && (
                    <button type="button" onClick={() => toggle(path)} className="p-1 rounded hover:bg-gray-100">
                        <DefaultIcon collapse={collapsed}/>
                    </button>
                )}
                <DefaultKey k={keyName}/>
            </div>
        );

        if (collapsed) return header;

        // Создаем дочерние элементы только когда они нужны
        const children = (
            entries.map(([k, _v]) => {
                const childPath = [...path, k as any];
                const childKey = pathKey(childPath);
                return (
                    <NodeMemo
                        key={`${childKey}-${revision}`} // Добавляем ревизию в key для принудительного обновления
                        pKey={childKey}
                        keyName={k as any}
                        deep={deep + 1}
                        clbEditorValue={clbEditorValue}
                        clbContainer={clbContainer}
                        clbHeader={clbHeader}
                    />
                );
            }));

        const containerParams = {
            ...baseParams,
            children: collapsed ? null : children,
            header,
            collapsed
        };

        return clbContainer?.(containerParams) ?? (
            <>
                {header}
                <DefaultContainer>{children}</DefaultContainer>
            </>
        );
    }

    // Обработка примитивных значений
    const params = {...baseParams, children: null};
    const editor = clbEditorValue?.(params);

    return editor ? editor : (
        <div className={clsx("flex items-center gap-2 py-1")}>
            <DefaultKey k={keyName}/>
            <DefaultInput
                keyName={String(keyName)}
                value={value}
                onCommit={(v) => toWrite(v, path)}
            />
        </div>
    );
};

// Мемоизированный компонент с улучшенным сравнением
const NodeMemo = React.memo(NodeInner, (prevProps, nextProps) => {
    // Более строгое сравнение пропсов
    return (
        prevProps.pKey === nextProps.pKey &&
        prevProps.keyName === nextProps.keyName &&
        prevProps.deep === nextProps.deep &&
        prevProps.clbEditorValue === nextProps.clbEditorValue &&
        prevProps.clbContainer === nextProps.clbContainer &&
        prevProps.clbHeader === nextProps.clbHeader
    );
});

NodeMemo.displayName = 'NodeMemo';

// Основной компонент с улучшенной реактивностью
export const JSONTreeEditor: React.FC<Props> = ({
                                                    jsonData,
                                                    clbEditorValue,
                                                    clbContainer,
                                                    clbHeader,
                                                    nameFieldOptions = 'options',
                                                }) => {
    _nfo = nameFieldOptions;

    const {json, load, revision} = useJsonStore(useShallow(s => ({
        load: s.loadFromProp,
        json: s.json,
        revision: s.revision
    })));

    // Загружаем данные при монтировании или изменении jsonData
    useEffect(() => {
        if (json) return;
        if (jsonData !== undefined) {
            load(jsonData);
        }
    }, [jsonData, load]);

    // Инициализируем стор, если он пустой, но есть данные
    useEffect(() => {
        if (!json && jsonData !== undefined) {
            load(jsonData);
        }
    }, [json, jsonData, load]);

    if (!json) return null;

    return (
        <NodeMemo
            key={`root-${revision}`} // Добавляем ревизию в key корневого элемента
            pKey={pathKey([])}
            keyName={null}
            deep={0}
            clbEditorValue={clbEditorValue}
            clbContainer={clbContainer}
            clbHeader={clbHeader}
        />
    );
};

export default JSONTreeEditor;