/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, 
  Merge, 
  FileImage, 
  Sparkles, 
  CheckCircle2, 
  Info, 
  AlertTriangle,
  Github,
  MonitorCheck,
  LayoutGrid
} from 'lucide-react';
import NUpCompiler from './components/NUpCompiler';
import PdfMerger from './components/PdfMerger';
import ImageToPdf from './components/ImageToPdf';
import PdfNUpPrinter from './components/PdfNUpPrinter';

type ActiveTab = 'nup' | 'pdfNup' | 'merge' | 'imageToPdf';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('nup');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast notifier
  const addNotification = (message: string, type: 'success' | 'info' | 'error') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // Tab configurations
  const tabs = [
    { id: 'nup', label: 'N-Up Page Handout Builder', icon: Printer, desc: 'Arrange multiple content cards per printable sheet' },
    { id: 'pdfNup', label: 'Uploaded PDF N-Up Printer', icon: LayoutGrid, desc: 'Re-layout uploaded PDF pages into dynamic multi-grids' },
    { id: 'merge', label: 'PDF Compilation Merger', icon: Merge, desc: 'Stitch separate PDF documents together locally' },
    { id: 'imageToPdf', label: 'Photos to PDF Album', icon: FileImage, desc: 'Compile image files into clean multi-page books' }
  ];

  return (
    <div className="min-h-screen bg-gray-50/70 text-gray-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {/* Visual Accent Header Background */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

      {/* Main Container Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative">
        
        {/* Humble and Clean Global App Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-8 border-b border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 font-display">Print & PDF Lab</h1>
                <p className="text-xs text-gray-400 font-medium">Native layout customization & document compiler utility</p>
              </div>
            </div>
          </div>

          {/* Clean Human Status Indicators */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Offline Webassembly compiler</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enhanced layouts</span>
            </span>
          </div>
        </header>

        {/* Beautiful Workspace Selector Tabs */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-100/60 p-1.5 rounded-2xl border border-gray-100">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`relative flex items-center gap-3.5 p-3.5 text-left rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-150' 
                      : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200/60 text-gray-500'
                  }`}>
                    <IconComponent className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold leading-tight tracking-wide font-display truncate">
                      {tab.label}
                    </span>
                    <span className="block text-[10px] text-gray-400 truncate mt-0.5">
                      {tab.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Workspace Animated Section with Slide Transitions */}
        <main className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.16 }}
            >
              {activeTab === 'nup' && (
                <NUpCompiler onNotify={addNotification} />
              )}
              {activeTab === 'pdfNup' && (
                <PdfNUpPrinter onNotify={addNotification} />
              )}
              {activeTab === 'merge' && (
                <PdfMerger onNotify={addNotification} />
              )}
              {activeTab === 'imageToPdf' && (
                <ImageToPdf onNotify={addNotification} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Absolute Minimal Footer */}
        <footer className="mt-20 pt-6 border-t border-gray-100 text-center text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Print & PDF Lab. Handcraft layouts with high physical dpi outputs.</p>
          <div className="flex gap-4">
            <span className="font-mono text-[10px]">VER v1.4.0</span>
          </div>
        </footer>

      </div>

      {/* Dynamic Toast Feedback Overlay Popups */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-3.5 rounded-2xl shadow-xl border flex gap-3 items-start pointer-events-auto bg-white ${
                toast.type === 'success' 
                  ? 'border-emerald-100 text-emerald-950 shadow-emerald-50/50' 
                  : toast.type === 'error'
                  ? 'border-red-100 text-red-950 shadow-red-50/50'
                  : 'border-blue-100 text-blue-950 shadow-blue-50/50'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />}
                {toast.type === 'error' && <AlertTriangle className="w-4.5 h-4.5 text-red-500" />}
                {toast.type === 'info' && <Info className="w-4.5 h-4.5 text-blue-500" />}
              </div>
              <div className="text-xs font-semibold leading-normal flex-1">
                {toast.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
