import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Check, X, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import './ImageCropModal.css';

/**
 * ImageCropModal
 * Interactive 1:1 circular/square canvas cropper with drag, zoom, and rotation.
 */
export default function ImageCropModal({
  isOpen,
  imageSrc,
  onCropComplete,
  onClose,
  aspectRatio = 1,
  cropShape = 'round', // 'round' or 'rect'
  title = 'Crop Profile Photo',
  loading = false,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Reset controls when a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setSaving(false);
      setImageLoaded(!!imageSrc);
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Mouse / Touch Drag Handlers
  const handlePointerDown = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPan({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Crop output generation
  const handleApplyCrop = async () => {
    if (!imageSrc || saving || loading) return;
    setSaving(true);

    try {
      let img = imgRef.current;
      // Fallback: load image object directly if DOM element isn't ready or natural dimensions missing
      if (!img || !img.complete || !img.naturalWidth) {
        img = await new Promise((resolve, reject) => {
          const imageObj = new Image();
          imageObj.crossOrigin = 'anonymous';
          imageObj.onload = () => resolve(imageObj);
          imageObj.onerror = (e) => reject(new Error('Failed to load image for cropping'));
          imageObj.src = imageSrc;
        });
      }

      const cropSize = 400; // Output square dimensions
      const canvas = document.createElement('canvas');
      canvas.width = cropSize;
      canvas.height = cropSize;
      const ctx = canvas.getContext('2d');

      // Fill transparent or white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cropSize, cropSize);

      const previewBox = containerRef.current?.getBoundingClientRect();
      const cropDiameter = Math.min(previewBox?.width || 300, previewBox?.height || 300) * 0.8;

      // Scale factor between preview display and exported canvas
      const scaleMultiplier = cropSize / cropDiameter;

      ctx.save();
      ctx.translate(cropSize / 2, cropSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom * scaleMultiplier, zoom * scaleMultiplier);

      // Translate by user pan offset relative to preview
      ctx.translate(pan.x / scaleMultiplier, pan.y / scaleMultiplier);

      // Draw original image centered
      const drawWidth = img.naturalWidth || 400;
      const drawHeight = img.naturalHeight || 400;

      // Calculate base scale to fit initial preview box
      const baseScale = Math.max(
        cropDiameter / drawWidth,
        cropDiameter / drawHeight
      );

      ctx.drawImage(
        img,
        (-drawWidth * baseScale) / 2,
        (-drawHeight * baseScale) / 2,
        drawWidth * baseScale,
        drawHeight * baseScale
      );

      ctx.restore();

      await new Promise((resolve) => {
        canvas.toBlob(
          async (blob) => {
            try {
              if (blob && onCropComplete) {
                await onCropComplete(blob);
              }
            } catch (cropErr) {
              console.error('onCropComplete error:', cropErr);
            } finally {
              resolve();
            }
          },
          'image/jpeg',
          0.92
        );
      });
    } catch (err) {
      console.error('Failed to crop image:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className="crop-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving || loading}>
            Cancel
          </Button>
          <Button
            icon={Check}
            onClick={handleApplyCrop}
            loading={saving || loading}
            disabled={saving || loading || !imageSrc}
          >
            Apply & Save Photo
          </Button>
        </div>
      }
    >
      <div className="crop-modal-body">
        <p className="crop-modal-hint">
          Drag to reposition and use the zoom slider to frame your photo.
        </p>

        {/* Viewport Frame */}
        <div
          ref={containerRef}
          className={`crop-viewport ${cropShape === 'round' ? 'crop-round' : 'crop-rect'}`}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
        >
          {imageSrc && (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              className="crop-image"
              onLoad={handleImageLoad}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
              draggable={false}
            />
          )}

          {/* Mask Overlay */}
          <div className="crop-mask-overlay">
            <div className={`crop-aperture ${cropShape === 'round' ? 'aperture-round' : 'aperture-rect'}`}>
              <div className="crop-aperture-grid" />
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="crop-controls-panel">
          {/* Zoom Slider */}
          <div className="crop-zoom-row">
            <button
              type="button"
              className="crop-icon-btn"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="crop-zoom-slider"
            />
            <button
              type="button"
              className="crop-icon-btn"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <span className="crop-zoom-label">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Rotation & Reset Actions */}
          <div className="crop-aux-actions">
            <button type="button" className="crop-action-btn" onClick={handleRotate}>
              <RotateCw size={15} />
              <span>Rotate 90°</span>
            </button>
            <button type="button" className="crop-action-btn" onClick={handleReset}>
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
