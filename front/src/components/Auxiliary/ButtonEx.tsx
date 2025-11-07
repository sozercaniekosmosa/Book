//0-ok, 1-processing, 2-error
import React, {FC, PropsWithChildren, useRef, useState} from "react";
import Dialog from "./Dialog.tsx";
import {Tooltip, TTooltipDirection} from "./Tooltip.tsx";
import Spinner from "./Spinner.tsx";
import clsx from "clsx";

interface IButtonExProps extends PropsWithChildren {
    style?: React.CSSProperties;
    className?: string;
    onAction?: (e?: React.MouseEvent<HTMLElement>) => Promise<number | any> | number | void;
    onClick?: (e?: React.MouseEvent<HTMLElement>) => void;
    onConfirm?: (e?: React.MouseEvent<HTMLElement>) => Promise<number | any> | number | void;
    onUpload?: (file?: File) => Promise<number | any> | number | void;
    dialogContent?: React.FC | React.ReactElement;
    disabled?: boolean;
    hidden?: boolean;
    title?: string;
    dir?: TTooltipDirection;
    description?: string;
    text?: string;
    autoFocus?: boolean;
    stopPropagation?: boolean;
    typeFiles?: string;
}

const ButtonEx: FC<IButtonExProps> = ({
                                          style = {},
                                          className = '',
                                          onAction = null,
                                          onClick = null,
                                          onUpload = null,
                                          disabled = false,
                                          hidden = false,
                                          children = null,
                                          onConfirm = null,
                                          dialogContent = null,
                                          title = null,
                                          dir = "right",
                                          description = 'Добавьте текст...',
                                          text = '',
                                          autoFocus = false,
                                          stopPropagation = false,
                                          typeFiles = '*',
                                          ...rest
                                      }) => {
    const [_state, set_state] = useState<number | void>(0)
    const [showAndDataEvent, setShowAndDataEvent] = useState<React.MouseEvent<HTMLElement>>();

    // Создаём ref для input
    const fileInputRef = useRef<HTMLInputElement>(null);

    let onAct = async (e: React.MouseEvent<HTMLElement>) => {
        if (disabled) return;
        if (stopPropagation) {
            e.preventDefault();
            e.stopPropagation();
        }
        onClick && onClick(e);
        if (onConfirm) {
            let s: React.SetStateAction<number | void>;
            if (e.ctrlKey) { //если с ctrl то без подтверждения
                set_state(1)
                s = await onConfirm(showAndDataEvent);
                setTimeout(() => set_state(s ?? 0), 500);
            } else {
                setShowAndDataEvent(e)
            }
            return e;
        }
        if (onAction) {
            set_state(1)
            const s = await onAction(e); //TODO: тут можно сделать try..catch на отлов ошибок или Promise callback
            setTimeout(() => set_state(s), 500);
        }
        if (onUpload) {
            if (fileInputRef.current) {
                fileInputRef.current.click(); // Программно вызываем клик на input
            }
        }
    }

    // Обработчик выбора файла
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            onUpload(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return <>
        {!hidden && <button
            type="button"
            autoFocus={autoFocus}
            style={style}
            className={clsx(
                className,
                'relative',
                'flex justify-center items-center',
                'px-1',
                'text-gray-500 rounded-[2px] ',
                !disabled && 'active:bg-gray-500/40',
                disabled ? '' : 'focus:outline-none focus:ring-3 focus:ring-offset-0 focus:ring-gray-500/50 select-none',
                disabled ? '' : 'hover:bg-gray-500/20 transition',
                _state == 2 ? 'bg-red-700 text-white transition hover:bg-red-700' : '',
                // _state == 1 || disabled ? 'bg-light-disabled' : '',
                _state == 1 || disabled ? 'text-current/20' : '',
            )}
            onClick={onAct} hidden={hidden} {...rest}>
            {title && <Tooltip text={title} direction={dir} className="!absolute w-full h-full"/>}
            {_state == 1 && <Spinner/>}
            {hidden ? '' : children}
            {hidden ? '' : text}
        </button>}
        {onConfirm ? <Dialog
            title={description} message="Уверены?"
            show={showAndDataEvent} setShow={setShowAndDataEvent}
            onConfirm={async () => {
                set_state(1);
                const s = await onConfirm(showAndDataEvent);
                setTimeout(() => set_state(s ?? 0), 500);
            }}
            props={{className: 'modal-sm'}}>{dialogContent}</Dialog> : ''}
        {/* Скрытый input для выбора файла */}
        <input
            type="file"
            ref={fileInputRef}
            style={{display: 'none'}}
            onChange={handleFileChange}
            accept={typeFiles} // "*" // или укажите нужные типы: "image/*", ".pdf", и т.д.
        />
    </>
};

export default ButtonEx;