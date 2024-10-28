import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Move, 
  Pencil, 
  FileUp, 
  Scissors, 
  ZoomIn, 
  ZoomOut, 
  Download,
  Undo,
  Hand
} from 'lucide-react';

const InfiniteCanvas = () => {
  // Canvas state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentTool, setCurrentTool] = useState('pan'); // 'pan', 'draw', 'crop'
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [cropArea, setCropArea] = useState(null);
  const [drawingPaths, setDrawingPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [pdfImages, setPdfImages] = useState([]);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size to match container
    const resizeCanvas = () => {
      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Convert screen coordinates to canvas coordinates
  const toCanvasCoords = (x, y) => ({
    x: (x - offset.x) / scale,
    y: (y - offset.y) / scale
  });

  // Handle mouse events
  const handleMouseDown = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    
    if (currentTool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: offsetX - offset.x, y: offsetY - offset.y });
    } else if (currentTool === 'draw') {
      const coords = toCanvasCoords(offsetX, offsetY);
      setCurrentPath([coords]);
    }
  };

  const handleMouseMove = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    
    if (isDragging && currentTool === 'pan') {
      setOffset({
        x: offsetX - dragStart.x,
        y: offsetY - dragStart.y
      });
    } else if (currentPath.length && currentTool === 'draw') {
      const coords = toCanvasCoords(offsetX, offsetY);
      setCurrentPath([...currentPath, coords]);
    }
  };

  const handleMouseUp = () => {
    if (currentTool === 'pan') {
      setIsDragging(false);
    } else if (currentTool === 'draw' && currentPath.length) {
      setDrawingPaths([...drawingPaths, currentPath]);
      setCurrentPath([]);
    }
  };

  // Handle PDF upload
  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      // In a real implementation, use pdf.js to convert PDF pages to images
      // For demo, using placeholder images
      const placeholderImages = [
        '/api/placeholder/400/600',
        '/api/placeholder/400/600'
      ];
      setPdfImages(placeholderImages);
    }
  };

  // Handle image drag
  const handleImageDrag = (index, e) => {
    const image = images[index];
    const coords = toCanvasCoords(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    
    const updatedImages = [...images];
    updatedImages[index] = {
      ...image,
      x: coords.x - image.width / 2,
      y: coords.y - image.height / 2
    };
    
    setImages(updatedImages);
  };

  // Crop PDF page
  const handleCrop = (pageIndex, cropArea) => {
    const image = pdfImages[pageIndex];
    const newImage = {
      src: image,
      x: 0,
      y: 0,
      width: cropArea.width,
      height: cropArea.height,
      cropX: cropArea.x,
      cropY: cropArea.y
    };
    
    setImages([...images, newImage]);
  };

  // Draw canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transform
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // Draw images
    images.forEach(img => {
      const image = new Image();
      image.src = img.src;
      ctx.drawImage(
        image,
        img.cropX || 0,
        img.cropY || 0,
        img.width,
        img.height,
        img.x,
        img.y,
        img.width,
        img.height
      );
    });
    
    // Draw paths
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2 / scale;
    
    drawingPaths.forEach(path => {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      path.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
    
    if (currentPath.length) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
    
    ctx.restore();
  };

  // Handle zoom
  const handleZoom = (direction) => {
    setScale(prevScale => {
      const newScale = direction === 'in' 
        ? prevScale * 1.2 
        : prevScale / 1.2;
      return Math.max(0.1, Math.min(5, newScale));
    });
  };

  // Update canvas on state changes
  useEffect(() => {
    redrawCanvas();
  }, [scale, offset, images, drawingPaths, currentPath]);

  return (
    <div className="h-screen flex">
      <div className="w-64 bg-gray-100 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="cursor-pointer">
              <Button className="w-full">
                <FileUp className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePDFUpload}
              />
            </label>
          </div>

          <div className="space-x-2">
            <Button
              size="sm"
              variant={currentTool === 'pan' ? 'default' : 'outline'}
              onClick={() => setCurrentTool('pan')}
            >
              <Hand className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={currentTool === 'draw' ? 'default' : 'outline'}
              onClick={() => setCurrentTool('draw')}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={currentTool === 'crop' ? 'default' : 'outline'}
              onClick={() => setCurrentTool('crop')}
            >
              <Scissors className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-x-2">
            <Button size="sm" onClick={() => handleZoom('in')}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => handleZoom('out')}>
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">PDF Pages</h3>
            <div className="space-y-2">
              {pdfImages.map((img, index) => (
                <div
                  key={index}
                  className="border rounded p-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={img} alt={`Page ${index + 1}`} className="w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: currentTool === 'pan' ? 'grab' : 'crosshair' }}
        />
      </div>
    </div>
  );
};

export default InfiniteCanvas;
