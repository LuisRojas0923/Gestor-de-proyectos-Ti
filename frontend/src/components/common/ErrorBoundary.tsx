import { Component, ErrorInfo, ReactNode } from 'react';
import { Title } from '../atoms/Title';
import { Text } from '../atoms/Text';
import Button from '../atoms/Button';
import { CHUNK_ERROR_RELOAD_MS, isChunkLoadError } from '../../utils/appVersion';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    isChunkError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    private chunkReloadTimeoutId: number | null = null;

    public state: State = {
        hasError: false,
        isChunkError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        const isChunkError = isChunkLoadError(error?.message ?? '');
        return { hasError: true, isChunkError };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error capturado por ErrorBoundary:', error, errorInfo);

        if (this.state.isChunkError) {
            this.chunkReloadTimeoutId = window.setTimeout(() => {
                window.location.reload();
            }, CHUNK_ERROR_RELOAD_MS);
        }
    }

    public componentWillUnmount() {
        if (this.chunkReloadTimeoutId !== null) {
            window.clearTimeout(this.chunkReloadTimeoutId);
        }
    }

    public render() {
        if (this.state.hasError) {
            if (this.state.isChunkError) {
                return (
                    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
                        <div className="max-w-md w-full text-center space-y-4">
                            <Title variant="h3" weight="bold" className="text-primary mb-2">
                                Actualizando el portal
                            </Title>
                            <Text color="text-secondary">
                                Se detectó una nueva versión. La página se recargará automáticamente en unos segundos.
                            </Text>
                            <Button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3"
                            >
                                Recargar ahora
                            </Button>
                        </div>
                    </div>
                );
            }

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
