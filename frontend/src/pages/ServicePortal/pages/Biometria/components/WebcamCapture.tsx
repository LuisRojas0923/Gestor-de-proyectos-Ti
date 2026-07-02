import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Text, MaterialCard } from '../../../../../components/atoms';
import { Camera, RefreshCw } from 'lucide-react';

interface WebcamCaptureProps {
    onCapture: (blobImage: Blob) => void;
    isLoading?: boolean;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, isLoading = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const startCamera = useCallback(async () => {
        setError(null);
        setCapturedImage(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "user" }, // Prefiere cámara frontal en móviles
                audio: false 
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play();
            }
        } catch (err: any) {
            console.error("Error accessing camera: ", err);
            setError("No se pudo acceder a la cámara. Por favor verifica los permisos.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    // Detener la cámara cuando el componente se desmonta
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    const capture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            // Optimización: Limitar la altura máxima a 720p (HD) para evitar enviar fotos 4K o 1080p pesadas
            const MAX_HEIGHT = 720;
            let width = video.videoWidth || video.clientWidth || 640;
            let height = video.videoHeight || video.clientHeight || 480;
            
            if (height > MAX_HEIGHT) {
                const ratio = width / height;
                height = MAX_HEIGHT;
                width = height * ratio;
            }
            
            // Establecer el tamaño del canvas asegurando que sean números enteros y mayores a 0
            canvas.width = Math.max(1, Math.floor(width));
            canvas.height = Math.max(1, Math.floor(height));
            
            const context = canvas.getContext('2d');
            if (context) {
                // Dibujar el frame actual del video en el canvas escalado
                context.drawImage(video, 0, 0, width, height);
                
                // Mostrar vista previa local con base64 (Calidad 0.7 es perfecta para pantallas)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setCapturedImage(dataUrl); 
                
                // Extraer el archivo binario (Blob) para enviar usando fetch para mayor compatibilidad mvil
                fetch(dataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        stopCamera();
                        onCapture(blob);
                    })
                    .catch(err => {
                        console.error("Error al generar el Blob de la imagen", err);
                        setError("Error al capturar la imagen. Intenta de nuevo.");
                    });
            }
        }
    }, [onCapture, stopCamera]);

    const retake = useCallback(() => {
        setCapturedImage(null);
        startCamera();
    }, [startCamera]);

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
            <MaterialCard className="w-full aspect-video relative overflow-hidden bg-black flex items-center justify-center rounded-2xl">
                {error ? (
                    <Text variant="body2" className="text-red-400 p-4 text-center">{error}</Text>
                ) : capturedImage ? (
                    <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                ) : (
                    <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                    />
                )}
                
                <canvas ref={canvasRef} className="hidden" />
            </MaterialCard>

            <div className="flex justify-center w-full gap-4 mt-4">
                {capturedImage ? (
                    <Button 
                        variant="outline" 
                        onClick={retake} 
                        icon={RefreshCw}
                        disabled={isLoading}
                        fullWidth
                    >
                        Tomar otra foto
                    </Button>
                ) : (
                    <Button 
                        variant="primary" 
                        onClick={capture} 
                        icon={Camera}
                        disabled={!stream || !!error}
                        fullWidth
                    >
                        Capturar y Autenticar
                    </Button>
                )}
            </div>
        </div>
    );
};

export default WebcamCapture;
