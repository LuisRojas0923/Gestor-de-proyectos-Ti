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
            
            // Establecer el tamaño del canvas al tamaño del video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            if (context) {
                // Dibujar el frame actual del video en el canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Mostrar vista previa local con base64
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedImage(dataUrl); 
                
                // Extraer el archivo binario (Blob) para enviar
                canvas.toBlob((blob) => {
                    if (blob) {
                        stopCamera();
                        onCapture(blob);
                    } else {
                        console.error("Error al generar el Blob de la imagen");
                        setError("Error al capturar la imagen. Intenta de nuevo.");
                    }
                }, 'image/jpeg', 0.8);
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
