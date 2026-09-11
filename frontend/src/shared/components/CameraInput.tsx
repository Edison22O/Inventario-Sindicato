import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage } from '@/shared/utils/imageCompressor';

interface CameraInputProps {
  onImageCaptured: (file: File) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  label?: string;
  required?: boolean;
  colorTheme?: 'blue' | 'emerald';
}

export const CameraInput: React.FC<CameraInputProps> = ({
  onImageCaptured,
  previewUrl,
  setPreviewUrl,
  label = 'Foto Evidencia del Tablero *',
  colorTheme = 'blue',
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Detener los tracks de video al cerrar la cámara o desmontar el componente
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  // Iniciar flujo de cámara WebRTC
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopStream();
    setCameraError(null);
    setIsCameraOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta cámara en vivo. Usa la opción de archivos.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('[CameraInput Error]', err);
      const msg = err.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Permite el acceso a la cámara o usa la galería.'
        : (err.message || 'No se pudo abrir la cámara.');
      setCameraError(msg);
      toast.error(msg);
      stopStream();
    }
  };

  const closeCamera = () => {
    stopStream();
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capturar foto del elemento <video>
  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (blob) {
          const rawFile = new File([blob], `evidencia_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setIsCompressing(true);
          try {
            const compressed = await compressImage(rawFile, 1024, 0.7);
            onImageCaptured(compressed);
            setPreviewUrl(URL.createObjectURL(compressed));
            toast.success('Foto capturada correctamente');
          } catch (e) {
            onImageCaptured(rawFile);
            setPreviewUrl(URL.createObjectURL(rawFile));
          } finally {
            setIsCompressing(false);
            closeCamera();
          }
        }
      },
      'image/jpeg',
      0.85
    );
  };

  // Manejar selección normal de archivo de galería
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file, 1024, 0.7);
        onImageCaptured(compressed);
        setPreviewUrl(URL.createObjectURL(compressed));
      } catch (e) {
        onImageCaptured(file);
        setPreviewUrl(URL.createObjectURL(file));
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const isEmerald = colorTheme === 'emerald';
  const activeBg = isEmerald ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">{label}</label>

      {/* Área de Previsualización o Botones de Captura */}
      {previewUrl ? (
        <div className="relative w-full h-52 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm bg-black group">
          <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => startCamera('environment')}
              className="px-4 py-2 bg-white/90 hover:bg-white text-gray-900 text-xs font-bold rounded-xl shadow flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-blue-600" /> Retomar Foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white/90 hover:bg-white text-gray-900 text-xs font-bold rounded-xl shadow flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" /> Elegir de Galería
            </button>
          </div>
          <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1.5 rounded-full shadow-md">
            <Check className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <div className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/70 p-5 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Foto del Tablero y Kilometraje</p>
            <p className="text-xs text-gray-400 mt-0.5">Captura en vivo desde el navegador sin salir de la página</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full mt-1">
            <button
              type="button"
              onClick={() => startCamera('environment')}
              className={`px-4 py-2.5 ${activeBg} text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2`}
            >
              <Camera className="w-4 h-4" /> Abrir Cámara en Vivo
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4 text-gray-500" /> Galería / Archivos
            </button>
          </div>
        </div>
      )}

      {/* Input de Archivos oculto como Fallback (Sin capture="environment" agresivo para evitar recargas) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* MODAL / OVERLAY DE CÁMARA EN VIVO WEBRTC */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6">
          {/* Header del Modal de Cámara */}
          <div className="w-full max-w-lg flex justify-between items-center text-white z-10 py-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold tracking-wide">Cámara en Vivo</span>
            </div>
            <button
              type="button"
              onClick={closeCamera}
              className="p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Visor de Video */}
          <div className="relative w-full max-w-lg flex-1 bg-black rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center my-4 border border-white/10">
            {cameraError ? (
              <div className="p-6 text-center text-white space-y-4">
                <p className="text-sm font-medium text-red-300">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-white text-gray-900 text-xs font-bold rounded-xl"
                >
                  Seleccionar desde Galería
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {isCompressing && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-3">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-xs font-bold">Procesando imagen...</span>
              </div>
            )}
          </div>

          {/* Controles de Disparo y Giro */}
          <div className="w-full max-w-lg flex items-center justify-around py-4 z-10">
            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-3 bg-white/15 hover:bg-white/25 text-white rounded-full transition-all shadow-md"
              title="Cambiar cámara frontal / trasera"
            >
              <RefreshCw className="w-6 h-6" />
            </button>

            {/* Botón de Captura estilo Obturador */}
            <button
              type="button"
              disabled={!!cameraError || isCompressing}
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 flex items-center justify-center transition-all shadow-2xl active:scale-95 disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-full bg-white shadow-inner flex items-center justify-center">
                <Camera className="w-7 h-7 text-gray-900" />
              </div>
            </button>

            <button
              type="button"
              onClick={closeCamera}
              className="p-3 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-full transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
