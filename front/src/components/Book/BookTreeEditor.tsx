import React, {useCallback, useEffect, useMemo, useState} from "react";
import clsx from "clsx";
import {useShallow} from "zustand/react/shallow";
import {useBookStore, useImageStore} from "./store/storeBook.ts";

export type Path = string[];
type PathKey = string;

export type CallbackParams = {
    toWrite: (value: any, p?: Path) => void;
    toSwitch: () => void;
    parent: any;
    keyName: string | null;
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
    useImageStore();

    // Подписываемся на конкретные части стора с помощью useShallow
    const {value, collapsed, revision} = useBookStore(useShallow(s => ({
        value: getAt(s.book, path),
        collapsed: !!s.collapsed[pKey],
        revision: s.revision // Подписываемся на ревизию для принудительных обновлений
    })));

    const {setAt, toggle} = useBookStore(useShallow(s => ({
        setAt: s.setAtPath,
        toggle: s.toggleCollapse,
    })));

    const parent = useMemo(() => {
        const state = useBookStore.getState();
        return getAt(state.book, path.slice(0, -1));
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
export const BookTreeEditor: React.FC<Props> = ({
                                                    clbEditorValue,
                                                    clbContainer,
                                                    clbHeader,
                                                    nameFieldOptions = 'options',
                                                }) => {
    _nfo = nameFieldOptions;

    const {book, load, revision} = useBookStore(useShallow(s => ({
        load: s.loadFromProp,
        book: s.book,
        revision: s.revision
    })));

    if (!book) return null;
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

export default BookTreeEditor;