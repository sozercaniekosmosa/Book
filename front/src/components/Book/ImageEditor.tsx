// src/components/ImageCropper.tsx
import {useRef, useState, useEffect, useCallback, MouseEvent} from 'react';

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ImageCropperProps {
    image: string; // base64 изображение
    onChange?: (croppedImage: string) => void; // base64 webp
    aspectRatio?: number; // опциональное соотношение сторон (например, 16/9, 1, 4/3)
    quality?: number; // качество webp (0-1), по умолчанию 1
}

export const ImageCropper = ({
                                 image,
                                 onChange,
                                 aspectRatio,
                                 quality = 1,
                             }: ImageCropperProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string>('');
    const [dragStart, setDragStart] = useState({x: 0, y: 0});

    const [cropArea, setCropArea] = useState<CropArea>({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });

    const [imageSize, setImageSize] = useState({width: 0, height: 0});
    const [scale, setScale] = useState(1);

    // Инициализация области кадрирования при загрузке изображения
    const handleImageLoad = useCallback(() => {
        if (!imageRef.current || !containerRef.current) return;

        const img = imageRef.current;
        const container = containerRef.current;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Вычисляем масштаб для отображения
        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        const newScale = Math.min(scaleX, scaleY, 1);

        setScale(newScale);
        setImageSize({
            width: img.naturalWidth * newScale,
            height: img.naturalHeight * newScale,
        });

        // Начальная область кадрирования - 80% от изображения по центру
        const initialWidth = img.naturalWidth * newScale * 1.0;
        const initialHeight = aspectRatio
            ? initialWidth / aspectRatio
            : img.naturalHeight * newScale * 1.0;

        setCropArea({
            x: (img.naturalWidth * newScale - initialWidth) / 2,
            y: (img.naturalHeight * newScale - initialHeight) / 2,
            width: initialWidth,
            height: Math.min(initialHeight, img.naturalHeight * newScale * 1.0),
        });

        setIsLoaded(true);
    }, [aspectRatio]);

    // Преобразование координат мыши в координаты относительно изображения
    const getRelativeCoords = useCallback((e: MouseEvent): { x: number; y: number } => {
        if (!containerRef.current || !imageRef.current) return {x: 0, y: 0};

        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = (containerRef.current.clientWidth - imageSize.width) / 2;
        const offsetY = (containerRef.current.clientHeight - imageSize.height) / 2;

        return {
            x: e.clientX - rect.left - offsetX,
            y: e.clientY - rect.top - offsetY,
        };
    }, [imageSize]);

    // Начало перетаскивания области
    const handleMouseDown = useCallback((e: MouseEvent, handle?: string) => {
        e.preventDefault();
        e.stopPropagation();

        const coords = getRelativeCoords(e);
        setDragStart(coords);

        if (handle) {
            setIsResizing(true);
            setResizeHandle(handle);
        } else {
            setIsDragging(true);
        }
    }, [getRelativeCoords]);

    // Перемещение
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging && !isResizing) return;

        const coords = getRelativeCoords(e);
        const deltaX = coords.x - dragStart.x;
        const deltaY = coords.y - dragStart.y;

        setCropArea((prev) => {
            let newArea = {...prev};

            if (isDragging) {
                // Перемещение всей области
                newArea.x = Math.max(0, Math.min(prev.x + deltaX, imageSize.width - prev.width));
                newArea.y = Math.max(0, Math.min(prev.y + deltaY, imageSize.height - prev.height));
            } else if (isResizing) {
                // Изменение размера
                const minSize = 50;

                switch (resizeHandle) {
                    case 'se': // Юго-восток
                        newArea.width = Math.max(minSize, Math.min(prev.width + deltaX, imageSize.width - prev.x));
                        newArea.height = aspectRatio
                            ? newArea.width / aspectRatio
                            : Math.max(minSize, Math.min(prev.height + deltaY, imageSize.height - prev.y));
                        break;
                    case 'sw': // Юго-запад
                        const newWidthSW = Math.max(minSize, prev.width - deltaX);
                        const newXSW = prev.x + prev.width - newWidthSW;
                        if (newXSW >= 0) {
                            newArea.width = newWidthSW;
                            newArea.x = newXSW;
                            newArea.height = aspectRatio
                                ? newArea.width / aspectRatio
                                : Math.max(minSize, Math.min(prev.height + deltaY, imageSize.height - prev.y));
                        }
                        break;
                    case 'ne': // Северо-восток
                        newArea.width = Math.max(minSize, Math.min(prev.width + deltaX, imageSize.width - prev.x));
                        const newHeightNE = aspectRatio
                            ? newArea.width / aspectRatio
                            : Math.max(minSize, prev.height - deltaY);
                        const newYNE = aspectRatio ? prev.y : prev.y + prev.height - newHeightNE;
                        if (newYNE >= 0) {
                            newArea.height = newHeightNE;
                            if (!aspectRatio) newArea.y = newYNE;
                        }
                        break;
                    case 'nw': // Северо-запад
                        const newWidthNW = Math.max(minSize, prev.width - deltaX);
                        const newXNW = prev.x + prev.width - newWidthNW;
                        const newHeightNW = aspectRatio
                            ? newWidthNW / aspectRatio
                            : Math.max(minSize, prev.height - deltaY);
                        const newYNW = aspectRatio ? prev.y : prev.y + prev.height - newHeightNW;
                        if (newXNW >= 0 && newYNW >= 0) {
                            newArea.width = newWidthNW;
                            newArea.x = newXNW;
                            newArea.height = newHeightNW;
                            if (!aspectRatio) newArea.y = newYNW;
                        }
                        break;
                }
            }

            return newArea;
        });

        setDragStart(coords);
    }, [isDragging, isResizing, dragStart, getRelativeCoords, imageSize, resizeHandle, aspectRatio]);

    // Завершение перетаскивания
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle('');
    }, []);

    // Обработчик для document events
    useEffect(() => {
        const handleGlobalMouseUp = () => handleMouseUp();
        const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
            if (isDragging || isResizing) {
                handleMouseMove(e as unknown as MouseEvent);
            }
        };

        document.addEventListener('mouseup', handleGlobalMouseUp);
        document.addEventListener('mousemove', handleGlobalMouseMove);

        return () => {
            document.removeEventListener('mouseup', handleGlobalMouseUp);
            document.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    // Кадрирование изображения
    const cropImage = useCallback(() => {
        if (!imageRef.current) return;

        const img = imageRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Преобразуем координаты обратно к оригинальному размеру изображения
        const realX = cropArea.x / scale;
        const realY = cropArea.y / scale;
        const realWidth = cropArea.width / scale;
        const realHeight = cropArea.height / scale;

        canvas.width = realWidth;
        canvas.height = realHeight;

        ctx.drawImage(
            img,
            realX,
            realY,
            realWidth,
            realHeight,
            0,
            0,
            realWidth,
            realHeight
        );

        const croppedBase64 = canvas.toDataURL('image/webp', quality);

        onChange(croppedBase64);
    }, [cropArea, scale, onChange, quality]);

    return (
        <div className="flex flex-col gap-4 w-full mx-auto">
            {/* Контейнер изображения */}
            <div
                ref={containerRef}
                className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden select-none"
                style={{cursor: isDragging ? 'grabbing' : 'default'}}
            >
                {/* Изображение */}
                <img
                    ref={imageRef}
                    src={image}
                    alt="Crop target"
                    onLoad={handleImageLoad}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full"
                    style={{
                        width: imageSize.width || 'auto',
                        height: imageSize.height || 'auto',
                    }}
                    draggable={false}
                />

                {isLoaded && (
                    <>
                        {/* Затемнение вокруг области кадрирования */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: `
                  linear-gradient(to right, 
                    rgba(0,0,0,0.6) ${((containerRef.current?.clientWidth || 0) - imageSize.width) / 2 + cropArea.x}px,
                    transparent ${((containerRef.current?.clientWidth || 0) - imageSize.width) / 2 + cropArea.x}px,
                    transparent ${((containerRef.current?.clientWidth || 0) - imageSize.width) / 2 + cropArea.x + cropArea.width}px,
                    rgba(0,0,0,0.6) ${((containerRef.current?.clientWidth || 0) - imageSize.width) / 2 + cropArea.x + cropArea.width}px
                  )
                `,
                            }}
                        />

                        {/* Overlay сверху */}
                        <div
                            className="absolute bg-black/60 pointer-events-none"
                            style={{
                                left: ((containerRef.current?.clientWidth || 0) - imageSize.width) / 2 + cropArea.x,
                                top: ((containerRef.current?.clientHeight || 0) - imageSize.height) / 2,
                                width: cropArea.width,
                                height: cropArea.y,
                            }}
                        />

                        {/* Overlay снизу */}
                        <div
                            className="absolute bg-black/60 pointer-events-none"
                            style={{
                                left: ((containerRef.current?.clientWidth || 0) - imageSize.width) / 2 + cropArea.x,
                                top: ((containerRef.current?.clientHeight || 0) - imageSize.height) / 2 + cropArea.y + cropArea.height,
                                width: cropArea.width,
                                height: imageSize.height - cropArea.y - cropArea.height,
                            }}
                        />

                        {/* Overlay слева */}
                        <div
                            className="absolute bg-black/60 pointer-events-none"
                            style={{
                                left: ((containerRef.current?.clientWidth || 0) - imageSize.width) / 2,
                                top: ((containerRef.current?.clientHeight || 0) - imageSize.height) / 2,
                                width: cropArea.x,
                                height: imageSize.height,
                            }}
                        />

                        {/* Overlay справа */}
                        <div
                            className="absolute bg-black/60 pointer-events-none"
                            style={{
                                left: ((containerRef.current?.clientWidth || 0) - imageSize.width) / 2 + cropArea.x + cropArea.width,
                                top: ((containerRef.current?.clientHeight || 0) - imageSize.height) / 2,
                                width: imageSize.width - cropArea.x - cropArea.width,
                                height: imageSize.height,
                            }}
                        />

                        {/* Область кадрирования */}
                        <div
                            className="absolute border-2 border-white shadow-lg"
                            style={{
                                left: ((containerRef.current?.clientWidth || 0) - imageSize.width) / 2 + cropArea.x,
                                top: ((containerRef.current?.clientHeight || 0) - imageSize.height) / 2 + cropArea.y,
                                width: cropArea.width,
                                height: cropArea.height,
                                cursor: isDragging ? 'grabbing' : 'grab',
                            }}
                            onMouseDown={(e) => handleMouseDown(e)}
                        >
                            {/* Сетка */}
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                                {[...Array(9)].map((_, i) => (
                                    <div key={i} className="border border-white/30"/>
                                ))}
                            </div>

                            {/* Угловые ручки изменения размера */}
                            {['nw', 'ne', 'sw', 'se'].map((handle) => (
                                <div
                                    key={handle}
                                    className="absolute w-4 h-4 bg-white rounded-full shadow-md border-2 border-blue-500 hover:scale-125 transition-transform"
                                    style={{
                                        top: handle.includes('n') ? -8 : 'auto',
                                        bottom: handle.includes('s') ? -8 : 'auto',
                                        left: handle.includes('w') ? -8 : 'auto',
                                        right: handle.includes('e') ? -8 : 'auto',
                                        cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize',
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, handle)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Информация о размере */}
            {isLoaded && (
                <div className="text-center text-sm text-gray-500">
                    Размер кадра: {Math.round(cropArea.width / scale)} × {Math.round(cropArea.height / scale)} px
                </div>
            )}

            {/* Кнопки управления */}
            <div className="flex gap-3 justify-center">
                <button
                    onClick={() => cropImage()}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-md"
                >
                    Применить
                </button>
            </div>
        </div>
    );
};