import React, { useState, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageLightboxProps {
    src: string;
    alt?: string;
    onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, onClose }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const posStart = useRef({ x: 0, y: 0 });

    const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
    const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
    const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

    const handleDoubleClick = () => {
        if (scale > 1) {
            handleReset();
        } else {
            setScale(2.5);
        }
    };

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (scale <= 1) return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        posStart.current = { ...position };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [scale, position]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPosition({ x: posStart.current.x + dx, y: posStart.current.y + dy });
    }, [isDragging]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 z-10">
                <div className="flex items-center gap-1">
                    <button onClick={handleZoomOut} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                        <ZoomOut size={20} />
                    </button>
                    <span className="text-white/60 text-xs font-bold min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                        <ZoomIn size={20} />
                    </button>
                    <button onClick={handleReset} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-1">
                        <RotateCcw size={18} />
                    </button>
                </div>
                <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                    <X size={22} />
                </button>
            </div>

            {/* Image Area */}
            <div
                className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDoubleClick={handleDoubleClick}
            >
                <img
                    src={src}
                    alt={alt || 'Ảnh phóng to'}
                    draggable={false}
                    className="max-w-[95vw] max-h-[85vh] object-contain select-none rounded-lg transition-transform duration-200"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transitionProperty: isDragging ? 'none' : 'transform',
                    }}
                />
            </div>

            {/* Hint */}
            <div className="text-center py-2 text-white/30 text-[10px] font-medium">
                Double-click để zoom · Kéo để di chuyển
            </div>
        </div>
    );
};
