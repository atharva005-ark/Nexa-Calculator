import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Play, Upload, VideoOff, X } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { evaluateExpression } from '../../lib/math/calculatorEngine';
import { useCalculator } from '../../context/CalculatorContext';

export const CameraScannerModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { settings, setSharedExpression, recordHistory } = useCalculator();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [evaluatedResult, setEvaluatedResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  if (!open) return null;

  const startCamera = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Camera access is not supported in this browser. Please upload an image instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `Camera access denied or unavailable: ${err.message}`
          : 'Unable to access camera. Please upload an image.'
      );
    }
  };

  const runOCR = async (source: string) => {
    setScanning(true);
    setErrorMsg(null);
    setOcrStatus('Initializing Tesseract OCR engine...');
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status) {
            const pct = typeof m.progress === 'number' ? ` ${Math.round(m.progress * 100)}%` : '';
            setOcrStatus(`${m.status}${pct}`);
          }
        },
      });
      const {
        data: { text },
      } = await worker.recognize(source);
      await worker.terminate();

      const cleaned = text
        .replace(/\n+/g, ' ')
        .replace(/[“”]/g, '')
        .replace(/x(?=\s*\d)/gi, '*')
        .trim();
      setRecognizedText(cleaned);
      setOcrStatus('Recognition complete. Review and edit before solving.');

      const ev = evaluateExpression(cleaned, {
        angleUnit: settings.angleUnit,
        precision: settings.precision,
        thousandsSeparator: settings.thousandsSeparator,
      });
      setEvaluatedResult(ev.ok ? ev.formattedResult : null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'OCR processing failed.');
      setOcrStatus('');
    } finally {
      setScanning(false);
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setImagePreview(dataUrl);
    stopCamera();
    void runOCR(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
        void runOCR(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSolveReviewed = () => {
    const expr = recognizedText.trim();
    if (!expr) return;
    const ev = evaluateExpression(expr, {
      angleUnit: settings.angleUnit,
      precision: settings.precision,
      thousandsSeparator: settings.thousandsSeparator,
    });
    if (ev.ok) {
      setEvaluatedResult(ev.formattedResult);
      setErrorMsg(null);
      void recordHistory({
        expression: expr,
        result: ev.formattedResult,
        mode: 'Camera OCR',
        angleUnit: settings.angleUnit,
      });
    } else {
      setEvaluatedResult(null);
      setErrorMsg(ev.error || 'Could not evaluate expression. Try correcting OCR characters.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#0F141F] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Camera Math Scanner (OCR)
          </h3>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Close scanner"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Capture a printed equation via webcam or upload an image. Always verify and edit the extracted expression before solving.
        </p>

        <div className="flex flex-wrap gap-2">
          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Open Camera</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={captureFrame}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capture & Scan</span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium cursor-pointer"
              >
                <VideoOff className="w-4 h-4" />
                <span>Stop Camera</span>
              </button>
            </>
          )}

          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload Image</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {cameraActive && (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black">
            <video ref={videoRef} autoPlay playsInline className="w-full max-h-64 object-contain" />
          </div>
        )}

        {imagePreview && !cameraActive && (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
            <img src={imagePreview} alt="Captured math equation" className="w-full max-h-52 object-contain" />
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {scanning && (
          <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{ocrStatus}</span>
          </div>
        )}

        {!scanning && ocrStatus && (
          <div className="text-xs text-slate-500 dark:text-slate-400">{ocrStatus}</div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-500">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Recognized Expression (Review & Edit Before Solving)
          </label>
          <input
            type="text"
            value={recognizedText}
            onChange={(e) => {
              setRecognizedText(e.target.value);
              setErrorMsg(null);
            }}
            placeholder="Extracted mathematical expression appears here..."
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {evaluatedResult !== null && (
          <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-900 px-4 py-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Computed Result</span>
            <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {evaluatedResult}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={!recognizedText.trim()}
            onClick={handleSolveReviewed}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 dark:bg-slate-800 text-white hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            Evaluate Here
          </button>
          <button
            type="button"
            disabled={!recognizedText.trim()}
            onClick={() => {
              setSharedExpression(recognizedText.trim());
              stopCamera();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:opacity-95 disabled:opacity-40 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Send to Calculator</span>
          </button>
        </div>
      </div>
    </div>
  );
};
