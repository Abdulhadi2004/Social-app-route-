import { useEffect } from 'react';

export function ImageLightbox({ src, alt = '', onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClose?.()}
      aria-label="Close"
    >
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}
