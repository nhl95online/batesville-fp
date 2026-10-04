import React, { useState, useEffect } from 'react';
import { RoomShape } from '../../types';
import { 
  X, 
  Compass, 
  Ruler, 
  Save, 
  Check, 
  Square, 
  Layers, 
  Columns, 
  Info, 
  AlertCircle 
} from 'lucide-react';

export interface RoomArchConfig {
  roomName: string;
  shape: RoomShape;
  lengthFt: number;
  widthFt: number;
  ceilingHeightFt: number;
  // Primary Door
  door1Wall: 'North' | 'South' | 'East' | 'West';
  door1PosFt: number;
  door1WidthFt: number;
  // Secondary Door (Optional)
  hasDoor2: boolean;
  door2Wall: 'North' | 'South' | 'East' | 'West';
  door2PosFt: number;
  door2WidthFt: number;
  // Room Wing (Optional)
  hasWing: boolean;
  wingWall: 'North' | 'South' | 'East' | 'West';
  wingOffsetFt: number;
  wingLengthFt: number;
  wingWidthFt: number;
  // L-Shape parameters
  lEastLongestFt: number;
  lWestLowerFt: number;
  lWestUpperFt: number;
  lCutoutXFt: number;
  notes: string;
}

interface RoomArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RoomArchConfig;
  customerName: string;
  accountNumber: string;
  onSave: (newConfig: RoomArchConfig) => Promise<void>;
  isSaving?: boolean;
}

export const RoomArchitectureModal: React.FC<RoomArchitectureModalProps> = ({
  isOpen,
  onClose,
  config,
  customerName,
  accountNumber,
  onSave,
  isSaving = false
}) => {
  const [form, setForm] = useState<RoomArchConfig>(config);

  useEffect(() => {
    setForm(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const calculatedSqFt = Math.round(
    form.shape === 'l-shaped'
      ? (form.lengthFt * form.widthFt) - ((form.lengthFt - form.lCutoutXFt) * (form.widthFt - form.lWestLowerFt))
      : form.lengthFt * form.widthFt
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-white tracking-wide flex items-center gap-2">
                Room Architecture & Dimensions
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  CAD Envelope
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Custom architectural layout for <strong className="text-amber-300">{customerName}</strong> (Acct #{accountNumber})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-700">
          
          {/* Room Name & General Notice */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl">
            <div className="flex items-center space-x-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="text-amber-900 leading-tight">
                <span className="font-bold">Architectural Precision:</span> Changes here immediately calibrate the 2D blueprint walls, dimension markers, and casket bay coordinates.
              </div>
            </div>
            <div className="px-3 py-1 bg-white rounded-xl border border-amber-300 text-amber-950 font-mono font-bold text-xs shrink-0">
              Floor Area: ~{calculatedSqFt} sq ft
            </div>
          </div>

          {/* 1. Room Shape Selection */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              1. Room Shape
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'l-shaped', label: 'L-Shaped', desc: 'Corner cutout (No peninsulas)' },
                { id: 'rectangle', label: 'Rectangle', desc: 'Standard 4-wall envelope' },
                { id: 'square', label: 'Square', desc: 'Equilateral perimeter' },
                { id: 'oval', label: 'Oval', desc: 'Elliptical curved hall' },
              ].map(s => {
                const isSelected = form.shape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, shape: s.id as RoomShape }))}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-2 ring-amber-400/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">{s.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Primary Dimensions */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              2. Envelope Dimensions (Feet)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Overall Length (North Wall)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.5"
                    min="10"
                    max="100"
                    value={form.lengthFt}
                    onChange={(e) => setForm(prev => ({ ...prev, lengthFt: parseFloat(e.target.value) || 28 }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-400 font-mono text-xs">ft</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Overall Width (East Wall - Longest)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.5"
                    min="8"
                    max="100"
                    value={form.widthFt}
                    onChange={(e) => setForm(prev => ({ ...prev, widthFt: parseFloat(e.target.value) || 19.5, lEastLongestFt: parseFloat(e.target.value) || 19.5 }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-400 font-mono text-xs">ft</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Ceiling Height
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.5"
                    min="7"
                    max="30"
                    value={form.ceilingHeightFt}
                    onChange={(e) => setForm(prev => ({ ...prev, ceilingHeightFt: parseFloat(e.target.value) || 11 }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-400 font-mono text-xs">ft</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. L-Shape Details (Only when shape is L-shaped) */}
          {form.shape === 'l-shaped' && (
            <div className="p-4 bg-gradient-to-r from-amber-50/50 via-slate-50 to-white border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-700" />
                  <span>3. L-Shape Wall Specifications (No Peninsulas)</span>
                </span>
                <span className="text-[10px] text-amber-800 font-medium">
                  Lower Area + Higher Area = {form.lWestLowerFt + form.lWestUpperFt} ft
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">
                    Lower West Wall
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      step="0.5"
                      value={form.lWestLowerFt}
                      onChange={(e) => setForm(prev => ({ ...prev, lWestLowerFt: parseFloat(e.target.value) || 13.5 }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-slate-800"
                    />
                    <span className="text-slate-400 text-xs">ft</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">
                    Higher Area Step
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      step="0.5"
                      value={form.lWestUpperFt}
                      onChange={(e) => setForm(prev => ({ ...prev, lWestUpperFt: parseFloat(e.target.value) || 6.0 }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-slate-800"
                    />
                    <span className="text-slate-400 text-xs">ft</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">
                    Corner Cutout Offset (X)
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      step="0.5"
                      value={form.lCutoutXFt}
                      onChange={(e) => setForm(prev => ({ ...prev, lCutoutXFt: parseFloat(e.target.value) || 13.5 }))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-slate-800"
                    />
                    <span className="text-slate-400 text-xs">ft</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Doorway Openings (Primary + Optional Secondary) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                4. Doorway Openings
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={form.hasDoor2}
                  onChange={(e) => setForm(prev => ({ ...prev, hasDoor2: e.target.checked }))}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px] font-semibold">Enable Secondary Doorway</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Door 1: Primary Entrance */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">
                  🚪 Primary Client Entrance
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Wall</label>
                    <select
                      value={form.door1Wall}
                      onChange={(e) => setForm(prev => ({ ...prev, door1Wall: e.target.value as any }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold"
                    >
                      <option value="South">South</option>
                      <option value="North">North</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Offset (ft)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.door1PosFt}
                      onChange={(e) => setForm(prev => ({ ...prev, door1PosFt: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Width (ft)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.door1WidthFt}
                      onChange={(e) => setForm(prev => ({ ...prev, door1WidthFt: parseFloat(e.target.value) || 4 }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Door 2: Optional Secondary Doorway */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                form.hasDoor2 ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/50 border-dashed border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-700 uppercase block">
                    🚪 Secondary Doorway (Optional)
                  </span>
                  {!form.hasDoor2 && (
                    <span className="text-[9px] text-slate-400 italic">Disabled</span>
                  )}
                </div>
                {form.hasDoor2 ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Wall</label>
                      <select
                        value={form.door2Wall}
                        onChange={(e) => setForm(prev => ({ ...prev, door2Wall: e.target.value as any }))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold"
                      >
                        <option value="North">North</option>
                        <option value="South">South</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Offset (ft)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.door2PosFt}
                        onChange={(e) => setForm(prev => ({ ...prev, door2PosFt: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Width (ft)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.door2WidthFt}
                        onChange={(e) => setForm(prev => ({ ...prev, door2WidthFt: parseFloat(e.target.value) || 3.5 }))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    Not all rooms have multiple doors. Check the box above if this funeral home has a secondary entrance or corridor access.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 5. Room Wings (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                5. Room Wings & Extensions (Optional)
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={form.hasWing}
                  onChange={(e) => setForm(prev => ({ ...prev, hasWing: e.target.checked }))}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px] font-semibold">Enable Room Wing</span>
              </label>
            </div>

            <div className={`p-3.5 rounded-2xl border transition-all ${
              form.hasWing ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/50 border-dashed border-slate-200 opacity-60'
            }`}>
              {form.hasWing ? (
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Wing Wall</label>
                    <select
                      value={form.wingWall}
                      onChange={(e) => setForm(prev => ({ ...prev, wingWall: e.target.value as any }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold"
                    >
                      <option value="West">West</option>
                      <option value="East">East</option>
                      <option value="North">North</option>
                      <option value="South">South</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Offset (ft)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.wingOffsetFt}
                      onChange={(e) => setForm(prev => ({ ...prev, wingOffsetFt: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Length (ft)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.wingLengthFt}
                      onChange={(e) => setForm(prev => ({ ...prev, wingLengthFt: parseFloat(e.target.value) || 8 }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-semibold mb-0.5">Depth (ft)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.wingWidthFt}
                      onChange={(e) => setForm(prev => ({ ...prev, wingWidthFt: parseFloat(e.target.value) || 6 }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">
                  Not all rooms have wings. Enable this option only if the showroom includes an alcove or side selection wing. (Peninsulas are excluded).
                </p>
              )}
            </div>
          </div>

          {/* 6. Notes / Description */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              6. Room Notes & Specifics
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Urn Wall on the left side of the upside down L-Shaped Room, All caskets are currently on DOUBLE RACKS."
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white resize-none"
            />
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Saving to Cloud...' : 'Save Architecture to Supabase'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
