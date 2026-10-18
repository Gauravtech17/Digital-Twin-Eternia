import React, { useEffect, useState, useRef } from 'react';
import { usePatient } from '../context/PatientContext';
import { api } from '../api/client';
import { ImagingAsset, Annotation, Observation } from '../api/types';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import {
  Upload,
  Image as ImageIcon,
  Ruler,
  Maximize2,
  Trash2,
  Plus,
  Layers,
  Sparkles,
  Info,
  CheckCircle,
  AlertCircle,
  Columns,
} from 'lucide-react';

export const ImagingLabPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const [assets, setAssets] = useState<ImagingAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ImagingAsset | null>(null);
  const [compareAsset, setCompareAsset] = useState<ImagingAsset | null>(null);
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Annotation Drawing state
  const [activeTool, setActiveTool] = useState<'NONE' | 'LINE' | 'ELLIPSE'>('NONE');
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [currentCoord, setCurrentCoord] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [calibrationFactor, setCalibrationFactor] = useState<string>('0.08');
  const [uploading, setUploading] = useState<boolean>(false);

  const loadAssets = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const data = await api.getPatientImagingAssets(selectedPatient.id);
      setAssets(data);
      if (data.length > 0) {
        setSelectedAsset(data[0]);
        if (data.length > 1) {
          setCompareAsset(data[1]);
        }
      }
    } catch (e) {
      console.error('Failed to load imaging assets:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotations = async (assetId: number) => {
    try {
      const annos = await api.getAssetAnnotations(assetId);
      setAnnotations(annos);
    } catch (e) {
      console.error('Failed to load annotations:', e);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [selectedPatient?.id]);

  useEffect(() => {
    if (selectedAsset) {
      loadAnnotations(selectedAsset.id);
    }
  }, [selectedAsset?.id]);

  // Handle Canvas Drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'NONE' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrawingStart({ x, y });
    setCurrentCoord({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setCurrentCoord({ x, y });
  };

  const handleMouseUp = async () => {
    if (!drawingStart || !currentCoord || !selectedAsset || activeTool === 'NONE') {
      setDrawingStart(null);
      setCurrentCoord(null);
      return;
    }

    // Calculate pixel distance
    const dx_px = (currentCoord.x - drawingStart.x) * selectedAsset.width_px;
    const dy_px = (currentCoord.y - drawingStart.y) * selectedAsset.height_px;
    const dist_px = Math.sqrt(dx_px * dx_px + dy_px * dy_px);

    let val = dist_px;
    let unit = 'px, uncalibrated';
    if (selectedAsset.is_calibrated && selectedAsset.mm_per_pixel) {
      val = dist_px * selectedAsset.mm_per_pixel;
      unit = 'mm';
    }

    const coords = {
      x1: drawingStart.x,
      y1: drawingStart.y,
      x2: currentCoord.x,
      y2: currentCoord.y,
    };

    try {
      const newAnno = await api.createAnnotation({
        imaging_asset_id: selectedAsset.id,
        shape_type: activeTool,
        coordinates_json: JSON.stringify(coords),
        measurement_value: Math.round(val * 10) / 10,
        measurement_unit: unit,
        label: activeTool === 'LINE' ? 'Caliper Distance' : 'Lesion Margin',
      });
      setAnnotations((prev) => [...prev, newAnno]);
    } catch (e) {
      console.error('Failed to save annotation:', e);
    } finally {
      setDrawingStart(null);
      setCurrentCoord(null);
      setActiveTool('NONE');
    }
  };

  const handleDeleteAnnotation = async (id: number) => {
    try {
      await api.deleteAnnotation(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error('Failed to delete annotation:', e);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedPatient) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const formData = new FormData();
      formData.append('patient_id', selectedPatient.id.toString());
      formData.append('file', uploadFile);
      const factor = parseFloat(calibrationFactor);
      if (!isNaN(factor) && factor > 0) {
        formData.append('mm_per_pixel', factor.toString());
      }

      const created = await api.uploadImagingAsset(formData);
      setUploadSuccess(`Upload successful: ${created.file_name} added to lab.`);
      setUploadFile(null);
      setUploadModalOpen(false);
      await loadAssets();
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed. Ensure PNG/JPEG format and <10MB size.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              Ultrasound Imaging Lab
            </h1>
            <span className="text-[10px] font-mono uppercase bg-accent-subtle accent-color px-2 py-0.5 rounded border border-accent">
              Serial Scans
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Synthetic ultrasound scans, spatial calibrations, and normalized coordinate annotations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              comparisonMode
                ? 'bg-accent-main text-white border-accent-main shadow-xs'
                : 'border-theme bg-surface hover:bg-surface-secondary text-text'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            {comparisonMode ? 'Exit Comparison' : 'Side-by-Side'}
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-main hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Scan
          </button>
        </div>
      </div>

      {/* Main Lab View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Timeline Gallery */}
        <div className="lg:col-span-1 bg-surface border border-theme rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-theme pb-2">
            <span className="text-xs font-bold text-text">Serial Scan Gallery</span>
            <span className="text-[10px] text-text-muted font-mono">{assets.length} scans</span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {assets.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-accent-subtle border-accent ring-2 ring-purple-500/20'
                      : 'bg-surface-secondary border-theme hover:bg-surface-hover'
                  }`}
                >
                  <img
                    src={asset.image_url}
                    alt={asset.file_name}
                    className="w-16 h-12 object-cover rounded-lg border border-theme bg-black shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-text truncate">
                      {asset.file_name}
                    </div>
                    <div className="text-[10px] text-text-muted font-mono mt-0.5">
                      {asset.width_px}×{asset.height_px} • {new Date(asset.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {asset.is_calibrated ? (
                        <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded">
                          Calibrated ({asset.mm_per_pixel} mm/px)
                        </span>
                      ) : (
                        <span className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded">
                          Uncalibrated (px)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Image Viewer & Annotation Canvas */}
        <div className={`space-y-3 ${comparisonMode ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <div className="bg-surface border border-theme rounded-2xl p-4 shadow-xs">
            {/* Viewer Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-theme pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text">Annotation Calipers:</span>
                <button
                  onClick={() => setActiveTool(activeTool === 'LINE' ? 'NONE' : 'LINE')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                    activeTool === 'LINE'
                      ? 'bg-accent-main text-white border-accent-main'
                      : 'border-theme bg-surface-secondary hover:bg-surface-hover text-text'
                  }`}
                >
                  Linear Caliper (Line)
                </button>
                <button
                  onClick={() => setActiveTool(activeTool === 'ELLIPSE' ? 'NONE' : 'ELLIPSE')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                    activeTool === 'ELLIPSE'
                      ? 'bg-accent-main text-white border-accent-main'
                      : 'border-theme bg-surface-secondary hover:bg-surface-hover text-text'
                  }`}
                >
                  Margin Caliper (Ellipse)
                </button>
              </div>

              {selectedAsset?.watermark_applied && (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  SYNTHETIC SCAN
                </span>
              )}
            </div>

            {/* Canvas Viewers Container */}
            {comparisonMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scan 1 */}
                <div>
                  <div className="text-xs font-semibold text-text mb-1">
                    Scan A: {selectedAsset?.file_name}
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-theme bg-black aspect-4/3 flex items-center justify-center">
                    {selectedAsset && (
                      <img
                        src={selectedAsset.image_url}
                        alt="Scan A"
                        className="w-full h-full object-contain select-none"
                      />
                    )}
                  </div>
                </div>

                {/* Scan 2 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-text">Scan B: Comparative</span>
                    <select
                      value={compareAsset?.id || ''}
                      onChange={(e) => {
                        const match = assets.find((a) => a.id === parseInt(e.target.value, 10));
                        if (match) setCompareAsset(match);
                      }}
                      className="text-[11px] bg-surface border border-theme rounded px-2 py-0.5"
                    >
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.file_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-theme bg-black aspect-4/3 flex items-center justify-center">
                    {compareAsset && (
                      <img
                        src={compareAsset.image_url}
                        alt="Scan B"
                        className="w-full h-full object-contain select-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Single Scan with Active Annotation Canvas */
              <div className="relative rounded-xl overflow-hidden border border-theme bg-black aspect-4/3 flex items-center justify-center">
                {selectedAsset ? (
                  <>
                    <img
                      src={selectedAsset.image_url}
                      alt={selectedAsset.file_name}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />

                    {/* SVG Overlay of Saved Annotations */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {annotations.map((anno) => {
                        try {
                          const coords = JSON.parse(anno.coordinates_json);
                          const x1 = coords.x1 * 100;
                          const y1 = coords.y1 * 100;
                          const x2 = coords.x2 * 100;
                          const y2 = coords.y2 * 100;

                          if (anno.shape_type === 'LINE') {
                            return (
                              <g key={anno.id}>
                                <line
                                  x1={`${x1}%`}
                                  y1={`${y1}%`}
                                  x2={`${x2}%`}
                                  y2={`${y2}%`}
                                  stroke="#38BDF8"
                                  strokeWidth="2"
                                />
                                <circle cx={`${x1}%`} cy={`${y1}%`} r="4" fill="#38BDF8" />
                                <circle cx={`${x2}%`} cy={`${y2}%`} r="4" fill="#38BDF8" />
                                <text
                                  x={`${(x1 + x2) / 2}%`}
                                  y={`${(y1 + y2) / 2 - 2}%`}
                                  fill="#38BDF8"
                                  fontSize="11"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {anno.measurement_value} {anno.measurement_unit}
                                </text>
                              </g>
                            );
                          } else {
                            const cx = (x1 + x2) / 2;
                            const cy = (y1 + y2) / 2;
                            const rx = Math.abs(x2 - x1) / 2;
                            const ry = Math.abs(y2 - y1) / 2;
                            return (
                              <g key={anno.id}>
                                <ellipse
                                  cx={`${cx}%`}
                                  cy={`${cy}%`}
                                  rx={`${rx}%`}
                                  ry={`${ry}%`}
                                  fill="rgba(244, 63, 94, 0.15)"
                                  stroke="#F43F5E"
                                  strokeWidth="2"
                                  strokeDasharray="4 2"
                                />
                                <text
                                  x={`${cx}%`}
                                  y={`${cy - ry - 2}%`}
                                  fill="#F43F5E"
                                  fontSize="11"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  {anno.label}
                                </text>
                              </g>
                            );
                          }
                        } catch {
                          return null;
                        }
                      })}
                    </svg>

                    {/* Interactive Drawing Canvas */}
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      className={`absolute inset-0 w-full h-full ${
                        activeTool !== 'NONE' ? 'cursor-crosshair' : 'cursor-default'
                      }`}
                    />
                  </>
                ) : (
                  <div className="text-text-muted text-xs">No scan selected.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata & Annotation Log (Only in single mode) */}
        {!comparisonMode && (
          <div className="lg:col-span-1 bg-surface border border-theme rounded-2xl p-4 space-y-4">
            <div>
              <div className="text-xs font-bold text-text mb-2 border-b border-theme pb-1">
                Scan Metadata
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Resolution:</span>
                  <span className="font-mono text-text">
                    {selectedAsset ? `${selectedAsset.width_px} × ${selectedAsset.height_px} px` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Spatial Scale:</span>
                  <span className="font-mono text-text">
                    {selectedAsset?.mm_per_pixel
                      ? `${selectedAsset.mm_per_pixel} mm/px`
                      : 'Uncalibrated'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Quality Score:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedAsset ? `${(selectedAsset.quality_score * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Format:</span>
                  <span className="font-mono text-text uppercase">
                    {selectedAsset?.mime_type.split('/')[1] || 'PNG'}
                  </span>
                </div>
              </div>
            </div>

            {/* Annotations List */}
            <div>
              <div className="text-xs font-bold text-text mb-2 border-b border-theme pb-1 flex justify-between items-center">
                <span>Active Annotations</span>
                <span className="text-[10px] text-text-muted font-mono">{annotations.length}</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {annotations.length === 0 ? (
                  <div className="text-[11px] text-text-muted text-center py-4">
                    Select a caliper tool above to draw annotations on the ultrasound scan.
                  </div>
                ) : (
                  annotations.map((anno) => (
                    <div
                      key={anno.id}
                      className="p-2 rounded-xl bg-surface-secondary border border-theme text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-text">{anno.label}</div>
                        <div className="text-[10px] font-mono text-text-muted">
                          {anno.measurement_value} {anno.measurement_unit}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAnnotation(anno.id)}
                        className="p-1 hover:text-rose-500 text-text-muted transition-colors"
                        title="Delete annotation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-theme rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-3">
              <h3 className="text-base font-bold text-text">Upload Ultrasound Scan</h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-text-muted hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-text mb-1">
                  Image File (PNG or JPEG only, max 10MB)
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  required
                  className="w-full text-xs border border-theme rounded-xl p-2 bg-surface-secondary"
                />
              </div>

              <div>
                <label className="block font-medium text-text mb-1">
                  Spatial Calibration Factor (mm per pixel)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.01"
                  max="1.0"
                  value={calibrationFactor}
                  onChange={(e) => setCalibrationFactor(e.target.value)}
                  className="w-full text-xs border border-theme rounded-xl p-2 bg-surface"
                  placeholder="e.g. 0.08"
                />
                <p className="text-[10px] text-text-muted mt-1">
                  Required for physical millimeter measurements. Omitted values are stored as "px, uncalibrated".
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-theme text-text hover:bg-surface-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-2 rounded-xl bg-accent-main hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
                >
                  {uploading ? 'Validating & Uploading...' : 'Upload & Calibrate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
