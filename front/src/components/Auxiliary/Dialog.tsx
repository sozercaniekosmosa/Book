import Modal from "./ModalWindow.tsx";
import ButtonEx from "./ButtonEx.tsx";

interface DialogProps {
    onKeyDown?: ({key}: { key: any }) => void
}

const Dialog = ({
                    show,
                    setShow,
                    title = 'Заголовок',
                    message = 'Сообщение',
                    onConfirm = null,
                    onUnconfirm = null,
                    children = null,
                    onClose = null,
                    confirmName = 'Да',
                    props = {},
                }) => {
    // const [show, setShow] = useState(true);

    const handleClose = () => {
        setShow(false);
        onClose && onClose()
    };

    return (<>
        <Modal show={!!show} onHide={handleClose} {...props}>
            <Modal.Header>
                <Modal.Title className="h6">{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="py-4">{children ? children : message}</Modal.Body>
            {onConfirm && <Modal.Footer className="gap-1">
                <ButtonEx className="hover:bg-gray-600 text-white bg-gray-500" onAction={handleClose}>Отмена</ButtonEx>
                <ButtonEx onAction={() => setShow(false) || onConfirm()}
                          autoFocus={true} className="hover:bg-red-800 text-white bg-red-700">{confirmName}</ButtonEx>
                <div className="w-full">
                    <ButtonEx
                        onAction={() => {
                            setShow(false);
                            onUnconfirm && onUnconfirm();
                        }}
                        autoFocus={true}
                        className="hover:bg-neutral-500 hover:text-neutral-50 text-gray-600 bg-gray-200">Закрыть</ButtonEx>
                </div>
            </Modal.Footer>}
        </Modal>
    </>);
}

export default Dialog;