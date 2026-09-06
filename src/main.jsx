import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-xl shadow-xl max-w-4xl w-full border-l-4 border-red-500">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                            🚫 Algo salió mal
                        </h1>
                        <p className="text-slate-600 mb-6">La aplicación encontró un error inesperado.</p>

                        <div className="bg-red-50 p-4 rounded-lg overflow-auto max-h-96 font-mono text-sm border border-red-100">
                            <p className="font-bold text-red-700 mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre className="text-red-600 whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                        >
                            Recargar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

import PublicApp from './PublicApp.jsx';

const hostname = window.location.hostname;
const searchParams = new URLSearchParams(window.location.search);
const hash = window.location.hash;
const pathname = window.location.pathname;

// Determine if we should show the App (Private Dashboard)
let isAppRoute = false;

if (searchParams.get('app') === 'true') {
    isAppRoute = true;
} else if (hostname.startsWith('app.')) {
    isAppRoute = true;
} else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (!hash.includes('#/track/') && !pathname.includes('/track/')) {
        isAppRoute = true;
    }
} else if (hostname === 'wolfbiso-stack.github.io') {
     // GitHub Pages fallback to app by default unless tracking
     if (!hash.includes('#/track/')) {
        isAppRoute = true;
     }
}

const MainComponent = isAppRoute ? App : PublicApp;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <MainComponent />
        </ErrorBoundary>
    </React.StrictMode>,
)
