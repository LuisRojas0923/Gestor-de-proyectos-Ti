import { Component, ErrorInfo, ReactNode } from 'react';
import { Title } from '../atoms/Title';
import { Text } from '../atoms/Text';
import Button from '../atoms/Button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        // Actualiza el estado para que el siguiente renderizado muestre la interfaz de repuesto
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-[2rem] border border-red-200 dark:border-red-800">
                            <Title variant="h3" weight="bold" className="text-red-600 dark:text-red-400 mb-2">
                                ¡Ups! Algo salió mal
                            </Title>
                            <Text color="text-secondary">
                                Hubo un error al cargar la página. Esto ocurre frecuentemente si tienes la traducción automática activa en tu navegador.
                            </Text>
                        </div>

                        <Button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3"
                        >
                            Recargar Página
                        </Button>

                        <Text variant="caption" color="text-secondary" className="opacity-60">
                            Tip: Desactiva la traducción automática del sitio si el error persiste.
                        </Text>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
