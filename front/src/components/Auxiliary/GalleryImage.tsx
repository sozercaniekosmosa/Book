import React, {useState, useEffect, useCallback} from "react";
import {motion, AnimatePresence} from "framer-motion";

type ImageGalleryProps = {
    images: any;
    onRenderImage?: (src: string, index: number) => React.ReactNode;
    isDblClick?: boolean;
};

const ImageGallery = ({images, onRenderImage, isDblClick = false}: ImageGalleryProps) => {
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);

    const close = useCallback(() => setCurrentIndex(null), []);

    const showPrev = useCallback(() => {
        if (currentIndex === null) return;
        setCurrentIndex((prev) =>
            prev === 0 ? images.length - 1 : (prev! - 1) % images.length
        );
    }, [currentIndex, images.length]);

    const showNext = useCallback(() => {
        if (currentIndex === null) return;
        setCurrentIndex((prev) =>
            prev === images.length - 1 ? 0 : (prev! + 1) % images.length
        );
    }, [currentIndex, images.length]);

    // Клавиатурное управление
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
            if (e.key === "ArrowLeft") showPrev();
            if (e.key === "ArrowRight") showNext();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [close, showPrev, showNext]);

    return (
        <div className="w-full">
            {/* Сетка миниатюр */}
            <div className="flex flex-wrap gap-3">
                {images.map((src, i) => (
                    <div
                        key={i}
                        className="cursor-pointer overflow-hidden"
                        onDoubleClick={(e) => {
                            isDblClick && e.target["tagName"] == 'IMG' && setCurrentIndex(i);
                        }}
                        onClick={(e) => {
                            !isDblClick && e.target["tagName"] == 'IMG' && setCurrentIndex(i);
                        }}
                    >
                        {onRenderImage ? (
                            onRenderImage(src, i)
                        ) : (
                            <img
                                src={src}
                                alt={`image-${i}`}
                                className="w-full h-40 object-cover hover:scale-105 transition-transform duration-300"
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Модальное окно */}
            <AnimatePresence>
                {currentIndex !== null && (
                    <motion.div
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        onClick={close}
                    >
                        {/* Кнопка закрытия */}
                        <button
                            onClick={close}
                            className="absolute top-4 right-4 text-white hover:text-gray-300"
                        >
                            <div className="bi-x text-xl"/>
                        </button>

                        {/* Кнопки навигации */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                showPrev();
                            }}
                            className="absolute left-4 text-white hover:text-gray-300"
                        >
                            <div className="bi-chevron-left text-4xl"/>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                showNext();
                            }}
                            className="absolute right-4 text-white hover:text-gray-300"
                        >
                            <div className="bi-chevron-right text-4xl"/>
                        </button>

                        {/* Изображение с анимацией */}
                        <motion.img
                            key={currentIndex}
                            src={images[currentIndex]}
                            alt={`image-${currentIndex}`}
                            initial={{scale: 0.95, opacity: .5}}
                            animate={{scale: 1, opacity: 1}}
                            exit={{scale: 0.8, opacity: 0}}
                            transition={{duration: 0.3}}
                            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ImageGallery;