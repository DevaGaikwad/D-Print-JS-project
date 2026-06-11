/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Download, 
  FileImage, 
  Grid, 
  Sparkles, 
  Layers, 
  HelpCircle,
  Settings
} from 'lucide-react';
import { ImageSlide, PaperSize, PaperOrientation } from '../types';
import { generateImagesToPdf } from '../utils/pdfGenerator';

interface ImageToPdfProps {
  onNotify: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function ImageToPdf({ onNotify }: ImageToPdfProps) {
  const [slides, setSlides] = useState<ImageSlide[]>([]);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [globalStyle, setGlobalStyle] = useState<'none' | 'polaroid' | 'classic'>('none');
  const [isCompiling, setIsCompiling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse image file additions
  const handleImageSelections = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedList: ImageSlide[] = [];
      const len = e.target.files.length;
      
      for (let i = 0; i < len; i++) {
        const file = e.target.files[i];
        
        // Confirm it's image format
        if (!file.type.startsWith('image/')) {
          onNotify(`"${file.name}" is not a recognized image.`, 'error');
          continue;
        }

        selectedList.push({
          id: `img-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          file: file,
          borderStyle: globalStyle,
          order: slides.length + selectedList.length
        });
      }

      if (selectedList.length > 0) {
        setSlides(prev => {
          const combined = [...prev, ...selectedList];
          return combined.map((s, idx) => ({ ...s, order: idx }));
        });
        onNotify(`Staged ${selectedList.length} image slides!`, 'success');
      }

      // Reset value so we can select same photos again if removed
      e.target.value = '';
    }
  };

  // Adjust style of individual items or bulk
  const updateSlideStyle = (id: string, style: 'none' | 'polaroid' | 'classic') => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, borderStyle: style } : s));
  };

  const applyGlobalStyle = (style: 'none' | 'polaroid' | 'classic') => {
    setGlobalStyle(style);
    setSlides(prev => prev.map(s => ({ ...s, borderStyle: style })));
    onNotify(`Applied ${style} borders to all staged slides.`, 'info');
  };

  // Move ordering shufflers
  const moveSlide = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...slides];

    // Swap positions
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setSlides(reordered.map((s, i) => ({ ...s, order: i })));
  };

  const removeSlide = (id: string, url: string) => {
    // Revoke object URL from memory space
    URL.revokeObjectURL(url);
    const filtered = slides.filter(s => s.id !== id);
    setSlides(filtered.map((s, i) => ({ ...s, order: i })));
    onNotify('Image slide removed', 'info');
  };

  const handleClearAll = () => {
    slides.forEach(s => URL.revokeObjectURL(s.url));
    setSlides([]);
    onNotify('Album collection cleared', 'info');
  };

  // Compile Album
  const handleCompileAlbum = async () => {
    if (slides.length === 0) {
      onNotify('Staging album is empty. Pick some photos first to generate PDF.', 'error');
      return;
    }

    setIsCompiling(true);
    try {
      const pdfBytes = await generateImagesToPdf(slides, paperSize, orientation);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = `photo_album_${Date.now()}_compiled.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      onNotify('Photo Album compiled and saved!', 'success');
    } catch (err: any) {
      console.error(err);
      onNotify(`Compilation failed: ${err.message}`, 'error');
    } finally {
      setIsCompiling(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Editor settings column left */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Style presets */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-md font-semibold text-gray-900 font-display">Album Formatting</h2>
          </div>

          {/* Paper Configurations */}
          <div className="grid grid-cols-2 gap-3 pb-2 border-b border-gray-50">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-1">Canvas Sheet</label>
              <select
                value={paperSize}
                onChange={e => setPaperSize(e.target.value as PaperSize)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="A4">A4 Page (Classic)</option>
                <option value="Letter">Letter Page (US Standard)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-1">Orientation</label>
              <select
                value={orientation}
                onChange={e => setOrientation(e.target.value as PaperOrientation)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="portrait">Portrait View</option>
                <option value="landscape">Landscape View</option>
              </select>
            </div>
          </div>

          {/* Frame select presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600">Select Image Border Framing style</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyGlobalStyle('none')}
                className={`py-2 px-1 text-xs rounded-xl border text-center transition-all font-medium ${
                  globalStyle === 'none'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Full-Bleed (Auto)
              </button>
              <button
                type="button"
                onClick={() => applyGlobalStyle('classic')}
                className={`py-2 px-1 text-xs rounded-xl border text-center transition-all font-medium ${
                  globalStyle === 'classic'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Classic Frame
              </button>
              <button
                type="button"
                onClick={() => applyGlobalStyle('polaroid')}
                className={`py-2 px-1 text-xs rounded-xl border text-center transition-all font-medium ${
                  globalStyle === 'polaroid'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Polaroid Styling
              </button>
            </div>
          </div>
        </div>

        {/* Staging actions launcher widget */}
        <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-md space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider block">Ready to compile?</span>
            <h3 className="text-md font-semibold font-display">Generate Book Deck</h3>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Import Photos</span>
            </button>

            <button
              onClick={handleCompileAlbum}
              disabled={isCompiling || slides.length === 0}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-950/30"
            >
              {isCompiling ? (
                <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isCompiling ? 'Rendering...' : 'Compile to PDF'}</span>
            </button>
          </div>
          
          {slides.length > 0 && (
            <div className="text-center">
              <button 
                type="button" 
                onClick={handleClearAll}
                className="text-[10px] text-red-300 hover:text-red-400 font-medium tracking-wide border-b border-transparent hover:border-red-400 pb-0.5"
              >
                Delete Album Collection ({slides.length})
              </button>
            </div>
          )}
        </div>

        {/* Core details hints */}
        <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 flex gap-3 text-indigo-950 text-xs shadow-2xs">
          <Sparkles className="w-4.5 h-4.5 shrink-0 text-indigo-600 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <span className="font-semibold block text-indigo-900">Polaroid Framing Magic</span>
            <p className="text-gray-600 leading-normal">Polaroid option embeds each individual photograph on an off-white background with subtle card outlines, frames, and adds a nice clean text tag at the base of each sheet containing your local filename details.</p>
          </div>
        </div>

      </div>

      {/* Album collection view dashboard right */}
      <div className="lg:col-span-7 space-y-6">
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelections}
          accept="image/*"
          multiple
          className="hidden"
        />

        {slides.length === 0 ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-4 border-dashed border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 rounded-3xl p-16 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileImage className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-[280px]">
              <h3 className="text-md font-semibold text-gray-800 font-display">Staging Deck is Empty</h3>
              <p className="text-xs text-gray-400 leading-normal">Tap here to import JPG, JPEG, and PNG image structures from your machine gallery.</p>
            </div>
            <span className="text-[10px] tracking-wide font-mono bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold">
              NO CLOUD COPIES
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest font-mono">
                Album Deck ({slides.length} Photos)
              </span>
              <span className="text-[10px] text-gray-400">
                Sorted sequentially from Page 1 to {slides.length}
              </span>
            </div>

            {/* Thumbnail cards layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence initial={false}>
                {slides.map((slide, index) => (
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.18 }}
                    className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-shadow flex flex-col"
                  >
                    {/* Frame Simulator Header mockup */}
                    <div className="bg-gray-50/60 p-2 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-400 font-semibold bg-white border px-2 py-0.5 rounded-md">
                        PAGE {index + 1}
                      </span>
                      
                      {/* Individual border style select override */}
                      <select
                        value={slide.borderStyle}
                        onChange={e => updateSlideStyle(slide.id, e.target.value as any)}
                        className="text-[10px] bg-white border border-gray-150 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="none">Full-Bleed</option>
                        <option value="classic">Classic Frame</option>
                        <option value="polaroid">Polaroid</option>
                      </select>
                    </div>

                    {/* Image space */}
                    <div className="h-44 bg-gray-900 relative flex items-center justify-center overflow-hidden">
                      <img 
                        src={slide.url} 
                        alt={slide.name}
                        className="max-width-full max-height-full object-contain pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      {slide.borderStyle === 'polaroid' && (
                        <div className="absolute inset-0 border-6 border-white/30 pointer-events-none" />
                      )}
                    </div>

                    {/* Meta info & Shufflers */}
                    <div className="p-3 bg-white space-y-3 flex-1 flex flex-col justify-between">
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-gray-800 truncate" title={slide.name}>
                          {slide.name}
                        </h4>
                        <span className="text-[9px] text-gray-400 font-mono">
                          Size: {formatSize(slide.size)}
                        </span>
                      </div>

                      {/* Direction and delete controls */}
                      <div className="flex items-center justify-between border-t border-gray-50 pt-2 shrink-0">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveSlide(index, 'up')}
                            className="bg-gray-50 hover:bg-gray-100 disabled:opacity-30 p-1.5 rounded-lg border border-gray-150 text-gray-600 transition-colors cursor-pointer"
                            title="Shift Slide Left"
                          >
                            <ChevronUp className="w-3.5 h-3.5 rotate-270" />
                          </button>
                          <button
                            type="button"
                            disabled={index === slides.length - 1}
                            onClick={() => moveSlide(index, 'down')}
                            className="bg-gray-50 hover:bg-gray-100 disabled:opacity-30 p-1.5 rounded-lg border border-gray-150 text-gray-600 transition-colors cursor-pointer"
                            title="Shift Slide Right"
                          >
                            <ChevronDown className="w-3.5 h-3.5 rotate-270" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSlide(slide.id, slide.url)}
                          className="text-[10px] text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
