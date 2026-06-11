/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Printer, 
  Download, 
  FileText, 
  LayoutGrid, 
  Sliders, 
  Settings, 
  Eye, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  Info,
  HelpCircle
} from 'lucide-react';
import { PageLayout, PaperSize, PaperOrientation } from '../types';
import { generatePdfNUp, getPdfDetails } from '../utils/pdfGenerator';

interface PdfNUpPrinterProps {
  onNotify: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function PdfNUpPrinter({ onNotify }: PdfNUpPrinterProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  
  // Layout parameters
  const [layout, setLayout] = useState<PageLayout>('2-up');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [drawPageBorders, setDrawPageBorders] = useState<boolean>(true);
  const [pageNumbersEnabled, setPageNumbersEnabled] = useState<boolean>(true);

  // Range controls
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);
  const [useWholePdf, setUseWholePdf] = useState<boolean>(true);

  // States
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format bytes
  const getFormattedSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // Inspect uploaded PDF
  const handleFileProcess = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      onNotify('Invalid file type! Please provide a standard PDF document.', 'error');
      return;
    }

    try {
      const details = await getPdfDetails(file);
      setSelectedFile(file);
      setPageCount(details.pageCount);
      setFileSizeStr(getFormattedSize(file.size));
      setStartPage(1);
      setEndPage(details.pageCount);
      setUseWholePdf(true);
      setPreviewBlobUrl(null); // Reset preview
      onNotify(`Successfully loaded "${file.name}" with ${details.pageCount} pages!`, 'success');
    } catch (err: any) {
      console.error(err);
      onNotify('Unable to parse the uploaded PDF headers. Try another file.', 'error');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileProcess(e.target.files[0]);
    }
  };

  const removeFile = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setSelectedFile(null);
    setPageCount(0);
    setPreviewBlobUrl(null);
  };

  // Dynamically recompile layout on any settings or source changes
  useEffect(() => {
    let active = true;
    
    const triggerCompile = async () => {
      if (!selectedFile) return;
      
      setIsCompiling(true);
      try {
        const compiledBytes = await generatePdfNUp(
          selectedFile,
          layout,
          paperSize,
          orientation,
          drawPageBorders,
          pageNumbersEnabled,
          useWholePdf,
          startPage,
          endPage
        );
        
        if (!active) return;
        
        const blob = new Blob([compiledBytes], { type: 'application/pdf' });
        const currentUrl = URL.createObjectURL(blob);
        
        setPreviewBlobUrl(prev => {
          if (prev) {
            URL.revokeObjectURL(prev);
          }
          return currentUrl;
        });
      } catch (err: any) {
        console.error(err);
        if (active) {
          onNotify(`Tiling operation failed: ${err.message}`, 'error');
        }
      } finally {
        if (active) {
          setIsCompiling(false);
        }
      }
    };
    
    // Add a tiny debounce to avoid double compilers on rapid option toggles or inputs
    const timer = setTimeout(() => {
      triggerCompile();
    }, 120);
    
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    selectedFile,
    layout,
    paperSize,
    orientation,
    drawPageBorders,
    pageNumbersEnabled,
    useWholePdf,
    startPage,
    endPage
  ]);

  // Download precompiled binary blob immediately
  const handleDownloadPrecompiled = () => {
    if (!previewBlobUrl || !selectedFile) {
      onNotify('Your compiled output is not ready yet.', 'error');
      return;
    }
    const link = document.createElement('a');
    link.href = previewBlobUrl;
    link.download = `nup_${layout}_${selectedFile.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('Completed exporting PDF handout!', 'success');
  };

  // Compute total compiled pages count projection helper
  const getCompiledPagesCount = () => {
    let cellsCount = 1;
    switch (layout) {
      case '2-up': cellsCount = 2; break;
      case '4-up': cellsCount = 4; break;
      case '6-up': cellsCount = 6; break;
      case '9-up': cellsCount = 9; break;
      default: cellsCount = 1; break;
    }
    const processedPages = useWholePdf ? pageCount : (endPage - startPage + 1);
    return Math.ceil(processedPages / cellsCount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Upload & Left settings menu */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* PDF drag-zone */}
        {!selectedFile ? (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-4 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-indigo-300'
            }`}
          >
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-md font-semibold text-gray-800 font-display">Upload PDF here</h3>
                <p className="text-xs text-gray-400 mt-1">drag & drop or click to pick standard PDF documents</p>
              </div>
              <div className="text-[10px] bg-white border px-3 py-1.5 rounded-full inline-block text-gray-400 font-mono">
                100% Offline Client-Side Sandbox Compile
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Active Source File</span>
              <button 
                onClick={removeFile}
                className="text-gray-400 hover:text-red-500 rounded-lg p-1 transition-colors hover:bg-gray-50"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border">
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center border border-red-100 shrink-0">
                <FileText className="w-5.5 h-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-gray-800 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </h4>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  Size: {fileSizeStr} • Total Pages: {pageCount}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Configurations Widget Panel */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900 font-display">Tiling Grid Options</h3>
          </div>

          {/* Grid selections */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pages Per Printed Screen</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['1-up', '2-up', '4-up', '6-up', '9-up'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayout(mode)}
                  className={`py-2 px-1 text-[11px] rounded-xl font-bold transition-all text-center border capitalize ${
                    layout === mode
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Paper configs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Paper Sheet Size</label>
              <div className="flex gap-2">
                {(['A4', 'Letter'] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className={`flex-1 py-2 text-xs rounded-lg font-semibold border text-center transition-all ${
                      paperSize === size
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Orientation</label>
              <div className="flex gap-2">
                {(['portrait', 'landscape'] as PaperOrientation[]).map((orient) => (
                  <button
                    key={orient}
                    type="button"
                    onClick={() => setOrientation(orient)}
                    className={`flex-1 py-2 text-xs rounded-lg font-semibold border text-center capitalize transition-all ${
                      orientation === orient
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {orient}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedFile && (
            <>
              <hr className="border-gray-100" />
              {/* Slicing Controls */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Page Range Selection</label>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="radio"
                      name="rangeType"
                      checked={useWholePdf}
                      onChange={() => setUseWholePdf(true)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span>All pages ({pageCount})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="radio"
                      name="rangeType"
                      checked={!useWholePdf}
                      onChange={() => setUseWholePdf(false)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span>Custom range</span>
                  </label>
                </div>

                {!useWholePdf && (
                  <div className="flex items-center gap-2.5 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                    <div className="flex-1">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">From Page</label>
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={startPage}
                        onChange={(e) => {
                          const val = Math.min(pageCount, Math.max(1, parseInt(e.target.value) || 1));
                          setStartPage(val);
                          if (val > endPage) setEndPage(val);
                        }}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-semibold text-gray-700"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">To Page</label>
                      <input
                        type="number"
                        min={startPage}
                        max={pageCount}
                        value={endPage}
                        onChange={(e) => {
                          const val = Math.min(pageCount, Math.max(startPage, parseInt(e.target.value) || startPage));
                          setEndPage(val);
                        }}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-semibold text-gray-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <hr className="border-gray-100" />

          {/* Checkbox Options */}
          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Visual Finishes</label>
            
            <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={drawPageBorders}
                onChange={e => setDrawPageBorders(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span>Render border around original pages</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={pageNumbersEnabled}
                onChange={e => setPageNumbersEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span>Draw "Original Page X" index badges</span>
            </label>
          </div>

          {/* Action launcher footer */}
          <div className="pt-2">
            <div className="text-[10px] text-gray-400 flex items-center gap-1.5 justify-center py-2 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-medium">Live layout sync enabled</span>
            </div>
          </div>
        </div>

        {/* N-Up Math metrics */}
        {selectedFile && (
          <div className="bg-indigo-50/65 border border-indigo-100 p-4 rounded-xl flex items-start gap-3.5 shadow-2xs">
            <LayoutGrid className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 space-y-1">
              <span className="font-semibold text-gray-800">Compilation Projections</span>
              <p>Stile allocation will pack <strong>{layout}</strong> coordinates onto each physical document page. The output PDF file will compile exactly <strong>{getCompiledPagesCount()} sheets</strong> printable in high-resolution.</p>
            </div>
          </div>
        )}

      </div>

      {/* Compiler Previewer Column Right */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Dynamic active Preview Window header */}
        <div className="bg-gray-900 text-white p-4.5 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider block">Real-time PDF Output</span>
            <h3 className="text-sm font-semibold font-display">Sheet Visualization Preview</h3>
          </div>
          
          <div className="flex gap-2.5">
            {previewBlobUrl && (
              <a
                href={previewBlobUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-gray-700 shadow-2xs"
                title="Open PDF directly in a new tab for native saving, zoom, and full printing"
              >
                <Eye className="w-4 h-4" />
                <span>Open in Tab</span>
              </a>
            )}
            <button
              onClick={handleDownloadPrecompiled}
              disabled={isCompiling || !selectedFile}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export & Save</span>
            </button>
          </div>
        </div>

        {/* Interactive iframe compiler renderer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5 font-medium">
              <Eye className="w-4 h-4" />
              <span>Real-Time PDF Viewer Panel</span>
            </div>
            {previewBlobUrl && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Preview Ready
              </span>
            )}
          </div>

          <div className="bg-gray-100 p-4 border border-gray-200 rounded-3xl min-h-[580px] flex flex-col items-center justify-center relative overflow-hidden">
            {isCompiling && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-500 font-semibold">Tiling Pages...</span>
              </div>
            )}
            {previewBlobUrl ? (
              <iframe
                key={previewBlobUrl}
                id="printable-nup-preview"
                src={previewBlobUrl}
                className="w-full h-[620px] bg-white border border-gray-300 rounded-2xl shadow-xl z-10"
                title="Live generated N-Up preview"
              />
            ) : (
              <div className="text-center p-8 space-y-3.5 max-w-sm">
                <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                  <FileText className="w-6.5 h-6.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 font-display">No Preview Rendered Yet</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-normal">
                    Upload your target PDF document first in the left configuration lane to render your custom layout.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional printing hints */}
        {selectedFile && (
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex items-start gap-3.5 text-amber-950 text-xs">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="font-bold text-amber-950">How to print N-up pages directly:</span>
              <p className="text-amber-900 leading-normal">The on-screen embedded viewer lets you interact, test layouts, and print directly. Tap on the <strong>Print icon</strong> inside the top PDF toolbar controls to load native systems layout controls instantly with the combined grid. Alternatively, click <strong>Open in Tab</strong> for full window printing conveniences.</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
