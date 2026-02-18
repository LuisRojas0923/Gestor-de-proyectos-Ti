import React, { Component, ErrorInfo, ReactNode } from 'react';

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
                            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                                ¡Ups! Algo salió mal
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Hubo un error al cargar la página. Esto ocurre frecuentemente si tienes la traducción automática activa en tu navegador.
                            </p>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg"
                        >
                            Recargar Página
                        </button>

                        <p className="text-sm text-gray-400">
                            Tip: Desactiva la traducción automática del sitio si el error persiste.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
