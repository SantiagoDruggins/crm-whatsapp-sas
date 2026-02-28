import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] p-6">
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-left">
            <h2 className="text-lg font-bold text-[#f87171] mb-2">Algo salió mal en esta página</h2>
            <p className="text-sm text-[#8b9cad] mb-4">
              {this.state.error?.message || 'Error inesperado. Prueba recargar o cambiar de cuenta.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#00c896] text-[#0f1419] font-semibold px-4 py-2 hover:bg-[#00e0a8]"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
