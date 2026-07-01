import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, MaterialCard, Button, Spinner } from '../../../../components/atoms';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { API_CONFIG, API_ENDPOINTS } from '../../../../config/api';
import { useAppContext } from '../../../../context/AppContext';
import axios from 'axios';
import { ArrowLeft, CheckCircle, XCircle, MapPin } from 'lucide-react';
import WebcamCapture from './components/WebcamCapture';

// Haversine formula to calculate distance in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

interface Zona {
    id: number;
    nombre: string;
    latitud: number;
    longitud: number;
    radio: number;
}

const BiometriaDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const { state: { user }, dispatch } = useAppContext();
    
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<'success' | 'error' | null>(null);
    const [resultMessage, setResultMessage] = useState<string>('');
    const [zonas, setZonas] = useState<Zona[]>([]);
    
    // Geolocation state
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [nearestZone, setNearestZone] = useState<Zona | null>(null);

    // Enrolment mode detection
    const isEnrolled = !!(user?.avatar && user.avatar.includes('biometria'));
    const [isEnrolling, setIsEnrolling] = useState(!isEnrolled);

    React.useEffect(() => {
        // Fetch zonas
        axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ZONAS}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => setZonas(res.data)).catch(err => console.error("Error loading zonas", err));

        // Get location
        if (!navigator.geolocation) {
            setLocationError("Tu navegador no soporta geolocalización.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setLocation({ lat, lng });
                setLocationError(null);
            },
            (error) => {
                console.error("Geolocation error:", error);
                let errorMessage = "No se pudo obtener tu ubicación.";
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = "Debes permitir el acceso a tu ubicación para registrar la asistencia.";
                }
                setLocationError(errorMessage);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, []);

    React.useEffect(() => {
        if (location && zonas.length > 0) {
            // Find if user is inside any zone
            for (const zona of zonas) {
                const distance = getDistanceFromLatLonInM(location.lat, location.lng, zona.latitud, zona.longitud);
                if (distance <= zona.radio) {
                    setNearestZone(zona);
                    return;
                }
            }
            setNearestZone(null); // Not inside any zone
        }
    }, [location, zonas]);

    const handleCapture = async (blobImage: Blob) => {
        // Validación de Geocerca
        if (!isEnrolling && zonas.length > 0 && !nearestZone) {
            addNotification('warning', 'Estás fuera de la zona de registro.');
            setResult('error');
            setResultMessage('Acércate a una zona de registro permitida para marcar tu asistencia.');
            return;
        }

        setIsLoading(true);
        setResult(null);
        setResultMessage('');

        try {
            const formData = new FormData();
            formData.append('image', blobImage, 'photo.jpg');
            
            if (isEnrolling) {
                // Enrollment POST
                await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ENROLAR}`, formData, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });

                // Fetch new profile to update user.avatar
                try {
                    const response = await axios.get(`${API_CONFIG.BASE_URL}/auth/yo`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (response.data) {
                        const normalizedUser = {
                            id: response.data.id,
                            cedula: response.data.cedula,
                            name: response.data.nombre || response.data.name || '',
                            email: response.data.email || response.data.correo,
                            role: response.data.rol || response.data.role || 'usuario',
                            avatar: response.data.avatar || response.data.url_avatar,
                            area: response.data.area,
                            cargo: response.data.cargo,
                            sede: response.data.sede,
                            centrocosto: response.data.centrocosto || response.data.centro_costo || '',
                            viaticante: typeof response.data.viaticante === 'boolean' ? response.data.viaticante : String(response.data.viaticante).toLowerCase() === 'true',
                            emailNeedsUpdate: response.data.email_needs_update !== undefined ? !!response.data.email_needs_update : false,
                            emailVerified: response.data.correo_verificado !== undefined ? !!response.data.correo_verificado : false,
                            passwordSet: response.data.password_set !== undefined ? !!response.data.password_set : true,
                            permissions: response.data.permissions || response.data.permisos || []
                        };
                        dispatch({ type: 'LOGIN', payload: normalizedUser });
                    }
                } catch (err) {
                    console.error("Error actualizando perfil tras enrolar", err);
                }

                setResult('success');
                setResultMessage('Rostro registrado exitosamente. Ahora puedes registrar tu asistencia.');
                addNotification('success', 'Perfil biométrico guardado.');
                setIsEnrolling(false);
            } else {
                // Verification POST
                if (location) {
                    formData.append('latitud', location.lat.toString());
                    formData.append('longitud', location.lng.toString());
                }
                if (nearestZone) {
                    formData.append('zona_id', nearestZone.id.toString());
                }

                const response = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_VERIFY}`, formData, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });

                if (response.data?.status === 'success') {
                    setResult('success');
                    setResultMessage('Identidad verificada exitosamente. Asistencia registrada.');
                    addNotification('success', 'Verificación exitosa.');
                } else {
                    setResult('error');
                    setResultMessage('No se pudo verificar la identidad. Intenta de nuevo.');
                    addNotification('error', 'Verificación fallida.');
                }
            }
        } catch (error: any) {
            console.error("Error en validación biométrica:", error);
            const msg = error.response?.data?.detail || 'Ocurrió un error en el servidor al verificar tu rostro.';
            
            // Auto switch to enroll if backend says not enrolled
            if (msg.toLowerCase().includes('no tiene un rostro enrolado')) {
                setIsEnrolling(true);
                addNotification('info', 'Por favor, registra tu rostro primero.');
                return;
            }

            setResult('error');
            setResultMessage(msg);
            addNotification('error', 'Error al procesar la biometría.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = () => {
        setResult(null);
        setResultMessage('');
    };

    return (
        <div className="flex-1 w-full p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
                <Button 
                    variant="ghost" 
                    icon={ArrowLeft} 
                    onClick={() => navigate('/service-portal/inicio')}
                    className="mr-2"
                >
                    Volver
                </Button>
                <div>
                    <Title variant="h3" weight="bold" className="text-slate-800 dark:text-white">
                        {isEnrolling ? 'Registro Biométrico' : 'Autenticación Facial'}
                    </Title>
                    <Text variant="body1" color="text-secondary">
                        {isEnrolling ? 'Registra tu rostro por primera vez para futuras verificaciones.' : 'Verifica tu identidad para registrar asistencia.'}
                    </Text>
                </div>
            </div>

            <MaterialCard className="p-6 md:p-8 flex flex-col items-center">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <Spinner size="lg" />
                        <Title variant="h6">Procesando imagen...</Title>
                        <Text variant="body2" color="text-secondary">Estamos procesando tu solicitud, por favor espera.</Text>
                    </div>
                ) : result === 'success' ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
                        <CheckCircle className="w-24 h-24 text-green-500" />
                        <div>
                            <Title variant="h4" className="text-green-600 mb-2">¡Completado!</Title>
                            <Text variant="body1">{resultMessage}</Text>
                        </div>
                        <Button variant="primary" onClick={() => {
                            if (resultMessage.includes('Ahora puedes registrar')) {
                                handleRetry();
                            } else {
                                navigate('/service-portal/inicio');
                            }
                        }}>
                            {resultMessage.includes('Ahora puedes registrar') ? 'Continuar a Verificación' : 'Volver al Inicio'}
                        </Button>
                    </div>
                ) : result === 'error' ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
                        <XCircle className="w-24 h-24 text-red-500" />
                        <div>
                            <Title variant="h4" className="text-red-600 mb-2">Error</Title>
                            <Text variant="body1">{resultMessage}</Text>
                        </div>
                        <Button variant="primary" onClick={handleRetry}>
                            Intentar de nuevo
                        </Button>
                    </div>
                ) : (locationError && !isEnrolling) ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
                        <MapPin className="w-16 h-16 text-amber-500" />
                        <div>
                            <Title variant="h5" className="text-amber-600 mb-2">Ubicación Requerida</Title>
                            <Text variant="body1">{locationError}</Text>
                        </div>
                        <Button variant="primary" onClick={() => window.location.reload()}>
                            Reintentar Permisos
                        </Button>
                    </div>
                ) : (!location && !isEnrolling) ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                        <Spinner size="md" />
                        <Text>Obteniendo tu ubicación exacta...</Text>
                    </div>
                ) : (
                    <div className="w-full">
                        <div className="mb-6 text-center space-y-2">
                            <Text variant="body1">
                                {isEnrolling 
                                    ? 'Asegúrate de estar en un lugar con buena iluminación para registrar tu rostro.' 
                                    : 'Por favor, asegúrate de tener buena iluminación y mira directamente a la cámara.'
                                }
                            </Text>
                            {!isEnrolling && (
                                <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full">
                                    <MapPin className={`w-4 h-4 ${nearestZone ? 'text-green-500' : 'text-amber-500'}`} />
                                    <Text variant="caption" className="font-medium">
                                        {nearestZone ? `En Zona: ${nearestZone.nombre}` : 'Fuera de zona registrada'}
                                    </Text>
                                </div>
                            )}
                        </div>
                        <WebcamCapture onCapture={handleCapture} isLoading={isLoading} />
                    </div>
                )}
            </MaterialCard>
        </div>
    );
};

export default BiometriaDashboard;
