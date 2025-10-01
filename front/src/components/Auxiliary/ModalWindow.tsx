import React, {createContext, useContext, useEffect} from 'react';

// Контекст для передачи onHide
const ModalContext = createContext<{ onHide: () => void } | null>(null);

const useModalContext = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModalContext должен использоваться внутри Modal');
    }
    return context;
};

// Типы для пропсов
interface ModalProps {
    show: boolean;
    onHide: () => void;
    children: React.ReactNode;
}

interface ModalHeaderProps {
    closeButton?: boolean;
    children: React.ReactNode;
}

interface ModalTitleProps {
    children: React.ReactNode;
    className?: string;
}

interface ModalBodyProps {
    children: React.ReactNode;
    className?: string;
}

interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
}

interface ButtonProps {
    variant?: 'secondary' | 'danger';
    onClick: () => void;
    size?: 'sm';
    autoFocus?: boolean;
    children: React.ReactNode;
}

// Основной компонент Modal
const Modal: React.FC<ModalProps> & {
    Header: React.FC<ModalHeaderProps>;
    Title: React.FC<ModalTitleProps>;
    Body: React.FC<ModalBodyProps>;
    Footer: React.FC<ModalFooterProps>;
} = ({show, onHide, children}) => {
    // Обработка Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onHide();
        };

        if (show) document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [show, onHide]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black opacity-40 transition-opacity"
                    onClick={onHide}
                ></div>

                {/* Модальное окно */}
                <ModalContext.Provider value={{onHide}}>
                    <div
                        className="relative inline-block transform overflow-hidden rounded-sm bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
                        {children}
                    </div>
                </ModalContext.Provider>
            </div>
        </div>
    );
};

// Header модального окна
Modal.Header = ({closeButton = true, children}) => {
    const {onHide} = useModalContext();

    return (
        <div className="flex items-start justify-between">
            <div className="text-lg font-medium leading-6 text-gray-900">
                {children}
            </div>
            {closeButton && (
                <button
                    type="button"
                    className="ml-3 inline-flex rounded-sm bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-3 focus:ring-gray-500/50"
                    onClick={onHide}
                >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            )}
        </div>
    );
};

// Заголовок
Modal.Title = ({className, children}) => {
    return (
        <h3 className={"text-lg font-medium leading-6 text-gray-900 " + className}>
            {children}
        </h3>
    );
};

// Тело модального окна
Modal.Body = ({className, children}) => {
    return (
        <div className={"mt-3 sm:mt-4 sm:ml-4 " + className}>
            {children}
        </div>
    );
};

// Подвал
Modal.Footer = ({className, children}) => {
    return (
        <div className={"mt-5 sm:mt-6 sm:flex sm:flex-row-reverse " + className}>
            {children}
        </div>
    );
};

// Кнопка
const Button: React.FC<ButtonProps> = ({
                                           variant = 'secondary',
                                           onClick,
                                           size = 'sm',
                                           autoFocus = false,
                                           children
                                       }) => {
    const baseClasses = "inline-flex justify-center rounded-sm border px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm";
    const variantClasses = {
        secondary: "border-transparent bg-gray-300 text-gray-700 hover:bg-gray-400 focus:ring-gray-500",
        danger: "border-transparent bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    };

    return (
        <button
            type="button"
            className={`${baseClasses} ${variantClasses[variant]}`}
            onClick={onClick}
            autoFocus={autoFocus}
        >
            {children}
        </button>
    );
};

export default Modal;

// Пример использования:
/*
<Modal show={show} onHide={handleClose}>
  <Modal.Header closeButton>
    <Modal.Title>Подтвердите действие</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <p>Вы действительно хотите выполнить это действие?</p>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleClose} size="sm">
      Отмена
    </Button>
    <Button variant="danger" onClick={handleConfirm} size="sm" autoFocus>
      Подтвердить
    </Button>
  </Modal.Footer>
</Modal>
*/