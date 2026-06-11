/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Merge, 
  AlertCircle, 
  CheckCircle,
  Clock,
  ExternalLink,
  Coins
} from 'lucide-react';
import { MergedFile } from '../types';
import { getPdfDetails, mergePdfs } from '../utils/pdfGenerator';

interface PdfMergerProps {
  onNotify: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function PdfMerger({ onNotify }: PdfMergerProps) {
  const [mergedFiles, setMergedFiles] = useState<MergedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse file sizes beautifully
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Extract PDF page count and construct file row
  const processFiles = async (fileList: FileList) => {
    const validPdfs: MergedFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        onNotify(`"${file.name}" is not a valid PDF file.`, 'error');
        continue;
      }

      try {
        // Read actual page count inside pdf-lib
        const details = await getPdfDetails(file);

        validPdfs.push({
          id: `merge-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: file.size,
          pageCount: details.pageCount,
          file: file,
          order: mergedFiles.length + validPdfs.length
        });
      } catch (err: any) {
        onNotify(`Failed to inspect page headers for ${file.name}.`, 'error');
        console.error(err);
      }
    }

    if (validPdfs.length > 0) {
      setMergedFiles(prev => {
        const combined = [...prev, ...validPdfs];
        // Ensure proper ordered array matching elements list
        return combined.map((f, i) => ({ ...f, order: i }));
      });
      onNotify(`Added ${validPdfs.length} PDF file(s) to queue!`, 'success');
    }
  };

  // Drag handlings
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
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
      // Reset input value to allow uploading same files again if deleted
      e.target.value = '';
    }
  };

  // Directional adjusters
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === mergedFiles.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reorderedList = [...mergedFiles];

    // Swap files
    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[targetIndex];
    reorderedList[targetIndex] = temp;

    // Apply updated order indices
    setMergedFiles(reorderedList.map((f, i) => ({ ...f, order: i })));
  };

  const removeItem = (id: string) => {
    const remaining = mergedFiles.filter(item => item.id !== id);
    setMergedFiles(remaining.map((f, i) => ({ ...f, order: i })));
    onNotify('Removed file from compilation deck', 'info');
  };

  // Merge execution
  const handleMergeAction = async () => {
    if (mergedFiles.length < 2) {
      onNotify('Stitch queue requires a minimum of 2 PDF files to compile', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const mergedBytes = await mergePdfs(mergedFiles);
      
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `merged_compilation_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onNotify('PDF files merged and saved successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      onNotify(`Merging operations failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Calculate sum counts
  const totalPagesSum = mergedFiles.reduce((sum, file) => sum + file.pageCount, 0);
  const totalStorageSum = mergedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="space-y-6">
      
      {/* Upload zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-4 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-sm' 
            : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-indigo-300'
        }`}
        onClick={triggerFileInput}
      >
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf"
          multiple
          className="hidden"
        />
        
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
            <Upload className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-semibold text-gray-800 font-display">Drag and drop your PDF catalogs here</h3>
            <p className="text-xs text-gray-400">or click to browse local files on your machine</p>
          </div>
          <div className="text-[10px] bg-white px-3 py-1.5 border border-gray-100 rounded-full inline-block text-gray-400 font-mono">
            Accepts: Standard PDF documents (.pdf)
          </div>
        </div>
      </div>

      {/* Queue container */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-md font-semibold text-gray-900 font-display">Compilation Queue</h2>
            <p className="text-xs text-gray-400">Order from top elements down. Reorder list items to fit compiling logic.</p>
          </div>
          {mergedFiles.length > 0 && (
            <button
              onClick={() => { setMergedFiles([]); onNotify('Queue cleared', 'info'); }}
              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
            >
              Clear All Files
            </button>
          )}
        </div>

        {mergedFiles.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-gray-100 rounded-2xl bg-gray-50/20">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Staging deck is empty. Upload your documentation catalogs to start merging.</p>
            <p className="text-xs text-gray-400 mt-1">Upload at least two files to enable the compilation merger operations.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {mergedFiles.map((fileItem, index) => (
                  <motion.div
                    key={fileItem.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-wrap items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 border border-gray-100 hover:border-gray-200 rounded-2xl transition-all gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* File Icon */}
                      <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center shrink-0">
                        <FileText className="w-5.5 h-5.5" />
                      </div>
                      
                      {/* Title Metadata */}
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-gray-800 truncate pr-4" title={fileItem.name}>
                          {fileItem.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 font-mono">
                          <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">PDF</span>
                          <span>Size: {formatBytes(fileItem.size)}</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-gray-300" />
                            {fileItem.pageCount} {fileItem.pageCount === 1 ? 'page' : 'pages'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Shuffling controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveItem(index, 'up')}
                        className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-500 hover:text-indigo-600 shadow-3xs disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Page Up"
                      >
                        <ChevronUp className="w-4.5 h-4.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === mergedFiles.length - 1}
                        onClick={() => moveItem(index, 'down')}
                        className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-500 hover:text-indigo-600 shadow-3xs disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Page Down"
                      >
                        <ChevronDown className="w-4.5 h-4.5" />
                      </button>
                      
                      <div className="h-5 w-[1px] bg-gray-200 mx-1.5" />

                      <button
                        type="button"
                        onClick={() => removeItem(fileItem.id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Aggregated Totals Bar */}
            <div className="bg-indigo-50/40 border border-indigo-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4 text-indigo-950 font-medium">
                <div className="space-y-0.5">
                  <span className="text-gray-400 text-[10px] uppercase font-mono tracking-wider">Total Documents Staged</span>
                  <p className="font-bold">{mergedFiles.length} separate PDF catalogs</p>
                </div>
                <div className="w-[1px] h-8 bg-indigo-100" />
                <div className="space-y-0.5">
                  <span className="text-gray-400 text-[10px] uppercase font-mono tracking-wider">Total Compiled Pages</span>
                  <p className="font-bold">{totalPagesSum} physical pages</p>
                </div>
                <div className="w-[1px] h-8 bg-indigo-100 mr-2" />
                <div className="space-y-0.5">
                  <span className="text-gray-400 text-[10px] uppercase font-mono tracking-wider">Cumulative Storage Load</span>
                  <p className="font-bold font-mono">{formatBytes(totalStorageSum)}</p>
                </div>
              </div>

              {/* Merge Trigger Button */}
              <button
                onClick={handleMergeAction}
                disabled={isProcessing || mergedFiles.length < 2}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-100 cursor-pointer"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Merge className="w-4.5 h-4.5" />
                )}
                <span>{isProcessing ? 'Stitching streams...' : 'Merge & Save Combined PDF'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Educational info overlay */}
      <div className="bg-gray-900 text-gray-300 p-5 rounded-3xl flex gap-4 items-start shadow-xs">
        <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold text-white font-display">Strict Client-Side Confidentiality</h4>
          <p className="text-xs leading-relaxed text-gray-400">All uploading, page counting, and file merging processes are executed <strong>100% locally on your machine web sandbox</strong> via standard Webassembly streams. Your sensitive documents are never transferred to external servers or cloud repositories, assuring total private compliance.</p>
        </div>
      </div>

    </div>
  );
}
