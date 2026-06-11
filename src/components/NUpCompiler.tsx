/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Download, 
  ChevronUp, 
  ChevronDown, 
  Grid, 
  Settings, 
  FileText, 
  Info,
  Layers,
  Sparkles,
  HelpCircle,
  Eye
} from 'lucide-react';
import { NUpCard, PageLayout, PaperSize, PaperOrientation } from '../types';
import { generateNUpPdf } from '../utils/pdfGenerator';

interface NUpCompilerProps {
  onNotify: (message: string, type: 'success' | 'info' | 'error') => void;
}

const PRESET_COLORS = [
  '#f3f4f6', // Light slate
  '#fee2e2', // Light red
  '#fef3c7', // Light amber
  '#dcfce7', // Light green
  '#e0e7ff', // Light indigo
  '#fae8ff', // Light purple
];

const INITIAL_CARDS: NUpCard[] = [
  {
    id: 'card-1',
    title: '01. Executive Overview',
    content: 'Our core target is optimizing mobile print layouts. Standard devices often print single documents with excessive negative margin, causing paper waste. N-Up layout aggregates content into dense grids (such as 2-Up vertical stack or 2x2 matrixes), saving layout real estate and material expenses.',
    order: 0,
    accentColor: '#e0e7ff'
  },
  {
    id: 'card-2',
    title: '02. System Specifications',
    content: 'Client-side rendering is handled natively on a full-stack container environment.\n\n- Runtime: React 18+ & Vite\n- Styling framework: Tailwind Utility CSS\n- High-performance PDF composition: pdf-lib streams\n- Native printing: Host-level @media media overrides.',
    order: 1,
    accentColor: '#dcfce7'
  },
  {
    id: 'card-3',
    title: '03. PDF Merging Features',
    content: 'Users can upload multiple independent PDF catalogs, visually order them in a staging panel, count active pages dynamically inside each nested document, and trigger seamless byte compilations into unified document pages without secondary external API calls.',
    order: 2,
    accentColor: '#fef3c7'
  },
  {
    id: 'card-4',
    title: '04. Image Album Compilation',
    content: 'Staged photographic slides (JPEG, PNG) can be adjusted to specific border style configurations, fitted elegantly into standardized physical dimensions, re-sorted by dragging / arrow adjustments, and exported as a clean presentation handbook.',
    order: 3,
    accentColor: '#fae8ff'
  }
];

export default function NUpCompiler({ onNotify }: NUpCompilerProps) {
  const [cards, setCards] = useState<NUpCard[]>(INITIAL_CARDS);
  const [layout, setLayout] = useState<PageLayout>('4-up');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form states for creating/editing cards
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('#e0e7ff');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form controls
  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) {
      onNotify('Card title or content is required', 'error');
      return;
    }

    if (editingId) {
      setCards(prev => prev.map(c => c.id === editingId 
        ? { ...c, title: newTitle, content: newContent, accentColor: selectedColor } 
        : c
      ));
      onNotify('Card updated successfully', 'success');
      setEditingId(null);
    } else {
      const newCard: NUpCard = {
        id: `card-${Date.now()}`,
        title: newTitle || `Section Block #${cards.length + 1}`,
        content: newContent || 'Enter content details here...',
        order: cards.length,
        accentColor: selectedColor
      };
      setCards(prev => [...prev, newCard]);
      onNotify('New card added', 'success');
    }

    setNewTitle('');
    setNewContent('');
  };

  const handleEditInit = (card: NUpCard) => {
    setEditingId(card.id);
    setNewTitle(card.title);
    setNewContent(card.content);
    setSelectedColor(card.accentColor);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewTitle('');
    setNewContent('');
  };

  const handleDelete = (id: string) => {
    const updated = cards.filter(c => c.id !== id);
    // Re-index remaining cards order
    const ordered = updated.map((c, i) => ({ ...c, order: i }));
    setCards(ordered);
    onNotify('Card deleted', 'info');
    if (editingId === id) handleCancelEdit();
  };

  // Ordering shufflers
  const moveCard = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === cards.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const items = [...cards].sort((a, b) => a.order - b.order);

    // Swap orders
    const tempOrder = items[index].order;
    items[index].order = items[targetIndex].order;
    items[targetIndex].order = tempOrder;

    setCards(items.sort((a, b) => a.order - b.order));
  };

  // Compile PDF
  const handleSavePdf = async () => {
    if (cards.length === 0) {
      onNotify('Please add at least one card block first', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const pdfBytes = await generateNUpPdf(cards, layout, paperSize, orientation);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `n_up_${layout}_${paperSize.toLowerCase()}_handout.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify('N-Up PDF generated and saved successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      onNotify(`Failed to generate PDF: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger Native Web Print with custom container
  const handlePrint = () => {
    if (cards.length === 0) {
      onNotify('Add card items to populate the print preview', 'error');
      return;
    }
    onNotify('Opening device print settings. Set layout to fit your page size.', 'info');
    window.print();
  };

  // Grid layout helper calculation
  const getGridColsClass = () => {
    switch (layout) {
      case '1-up': return 'grid-cols-1';
      case '2-up': return orientation === 'landscape' ? 'grid-cols-2' : 'grid-cols-1';
      case '4-up': return 'grid-cols-2';
      case '6-up': return 'grid-cols-2';
      default: return 'grid-cols-1';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Configuration Column */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Layout Preferences Widget */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-md font-semibold text-gray-900 font-display">Grid & Sheet Preferences</h2>
          </div>
          
          {/* N-Up Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Tiling Layout (N-Up)</label>
            <div className="grid grid-cols-4 gap-2">
              {(['1-up', '2-up', '4-up', '6-up'] as PageLayout[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayout(mode)}
                  className={`py-2 px-1 text-xs rounded-xl font-medium transition-all text-center border capitalize ${
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

          <div className="grid grid-cols-2 gap-4">
            {/* Paper Size */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Sheet Size</label>
              <div className="flex gap-2">
                {(['A4', 'Letter'] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className={`flex-1 py-1.5 px-3 text-xs rounded-lg font-medium border text-center transition-all ${
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

            {/* Orientation */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Orientation</label>
              <div className="flex gap-2">
                {(['portrait', 'landscape'] as PaperOrientation[]).map((orient) => (
                  <button
                    key={orient}
                    type="button"
                    onClick={() => setOrientation(orient)}
                    className={`flex-1 py-1.5 px-3 text-xs rounded-lg font-medium border text-center capitalize transition-all ${
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

          {/* Core print hints */}
          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/50 flex gap-3 text-amber-900">
            <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-700" />
            <div className="text-xs space-y-1">
              <span className="font-semibold block text-amber-950">Quick Printing Tip:</span>
              <p>To print from the browser, click <strong>Print Web Handout</strong> and select your target destination. Check "Simplify Layout" or "Background Graphics" in the print settings for background color fills!</p>
            </div>
          </div>
        </div>

        {/* Card Editor Tool */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h2 className="text-md font-semibold text-gray-900 font-display">
                {editingId ? 'Edit Content Card' : 'Add Content Card'}
              </h2>
            </div>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 py-1 px-3 rounded-lg transition-all"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleAddOrUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Card Heading</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="01. Abstract Introduction"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Card Body Content</label>
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                rows={3}
                placeholder="Enter detailed notes or lists here..."
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            {/* Accent Color Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Side Border Accent Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-7 h-7 rounded-lg border-2 ${
                      selectedColor === color ? 'border-indigo-600 scale-110 shadow-sm' : 'border-gray-200'
                    } transition-all`}
                    title="Select border theme"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-100 cursor-pointer"
            >
              {editingId ? (
                <>
                  <CheckIcon className="w-4 h-4" /> Save Modification
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Insert Card Item
                </>
              )}
            </button>
          </form>
        </div>

        {/* Interactive Deck List */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h2 className="text-md font-semibold text-gray-900 font-display">Staged Deck ({cards.length} Cards)</h2>
            </div>
            {cards.length > 0 && (
              <button 
                onClick={() => { setCards([]); onNotify('Deck cleared', 'info'); }}
                className="text-xs text-red-500 hover:text-red-600 cursor-pointer"
              >
                Clear Deck
              </button>
            )}
          </div>

          {cards.length === 0 ? (
            <div className="text-center py-8 px-4 border-2 border-dashed border-gray-100 rounded-xl">
              <HelpCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Your layout deck is empty. Add a custom content card above to begin tiling!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-76 overflow-y-auto pr-1">
              {cards.map((card, index) => (
                <div 
                  key={card.id}
                  className={`flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all ${
                    editingId === card.id ? 'bg-indigo-50/50 border-indigo-200' : 'bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Color Accent Indicator */}
                    <div 
                      className="w-3.5 h-3.5 rounded-md border border-gray-300 shrink-0" 
                      style={{ backgroundColor: card.accentColor }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-gray-800 truncate">{card.title || 'Untitled Card'}</h4>
                      <p className="text-[10px] text-gray-400 truncate">{card.content || 'No description'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Shift Controls */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveCard(index, 'up')}
                      className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === cards.length - 1}
                      onClick={() => moveCard(index, 'down')}
                      className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {/* Edit Trigger */}
                    <button
                      type="button"
                      onClick={() => handleEditInit(card)}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                      title="Edit card"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Trash */}
                    <button
                      type="button"
                      onClick={() => handleDelete(card.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Output / Interactive Canvas Column */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Actions Deck */}
        <div className="bg-gray-900 text-white p-4.5 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-indigo-200 font-semibold tracking-wider uppercase block">Export & Handouts</span>
            <h3 className="text-sm font-semibold font-display">Select Output Strategy</h3>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-white hover:bg-gray-100 text-gray-900 font-semibold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-gray-700" />
              <span>Print Web Layout</span>
            </button>

            <button
              onClick={handleSavePdf}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-900/30"
            >
              {isGenerating ? (
                <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Compiling...' : 'Save PDF Document'}</span>
            </button>
          </div>
        </div>

        {/* Physical Paper Canvas Simulator Mockup */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-2 text-gray-500">
            <div className="flex items-center gap-1.5 font-medium">
              <Eye className="w-4 h-4" />
              <span>Realistic Canvas Simulator ({paperSize} • {orientation})</span>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-semibold">Tiled: {layout}</span>
          </div>

          {/* Paper container mockup with proper physical dimensional aspect ratio */}
          <div className="bg-gray-100 p-8 rounded-2xl border border-gray-200/60 shadow-inner flex justify-center items-center overflow-x-auto">
            <div 
              id="printable-preview"
              style={{
                // A4 is 1 : 1.414 aspect ratio, Portrait config matches this perfectly
                aspectRatio: orientation === 'portrait' ? '1 / 1.414' : '1.414 / 1',
              }}
              className={`w-full max-w-[520px] bg-white p-6 md:p-8 shadow-xl border border-gray-300 rounded-xs relative transition-all duration-300`}
            >
              {/* Paper Watermark details */}
              <div className="absolute top-2 right-3 font-mono text-[8px] text-gray-300 select-none uppercase tracking-widest pointer-events-none">
                {paperSize} SHEET LAYOUT • {orientation}
              </div>

              {cards.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-8">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                    <Grid className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-700 font-display">No Blocks Drafted</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-[240px]">Create or recover default layout cards in the editorial editor on the left side menu.</p>
                </div>
              ) : (
                <div className={`grid gap-4 h-full ${getGridColsClass()}`}>
                  {cards.map((card, index) => {
                    // Decide scaling and styles
                    let scaleClass = 'text-xs';
                    let hClass = 'h-full';
                    if (layout === '4-up' || layout === '6-up') {
                      scaleClass = 'text-[10px] md:text-xs leading-normal';
                    }

                    return (
                      <div
                        key={card.id}
                        style={{ borderColor: card.accentColor }}
                        className={`bg-white border-2 rounded-lg p-3 md:p-4 flex flex-col relative transition-colors duration-200 overflow-hidden shadow-2xs ${hClass}`}
                      >
                        <div 
                          className="w-full h-1 absolute top-0 left-0" 
                          style={{ backgroundColor: card.accentColor }}
                        />
                        
                        <div className="flex justify-between items-baseline mb-1 md:mb-2 mt-1">
                          <h4 className="font-bold text-gray-800 text-[11px] md:text-xs truncate font-display max-w-[80%]">
                            {card.title || 'Untitled Card'}
                          </h4>
                          <span className="font-mono text-[8px] font-semibold text-indigo-500">
                            #{index + 1}
                          </span>
                        </div>

                        <hr className="border-gray-100 mb-2" />

                        <div className={`text-gray-600 font-sans break-words whitespace-pre-wrap flex-1 ${scaleClass}`}>
                          {card.content}
                        </div>

                        {/* Extra item markers */}
                        <div className="text-[7px] text-gray-300 font-mono text-right mt-2 pointer-events-none select-none">
                          PDF COMPILER ELEMENT
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* N-Up Math details */}
        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-start gap-3.5">
          <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 space-y-1">
            <span className="font-semibold text-gray-800">Dynamic Multi-Grid Logic</span>
            <p>Choosing <strong>2-Up / 4-Up / 6-Up</strong> triggers dynamic canvas chunking. If the quantity of card inputs exceeds the available cells per sheet, additional printable pages are rendered automatically inside the resulting N-Up PDF document stream.</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// Inline fallback check indicator to maintain checklist
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
