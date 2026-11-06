import { Component, type ReactNode } from 'react';
import { Button, EmptyState } from './ui';
import { tr } from '../lib/i18n';

/** Keeps a failing module from taking down the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(tr('Error en el módulo'), error); }
  render() {
    if (this.state.error) {
      return (
        <EmptyState icon="alert" title={tr('Este módulo encontró un problema')} body={tr('{message}. Tus datos están a salvo.', { message: this.state.error.message })}
          action={<Button icon="refresh" onClick={() => this.setState({ error: null })}>{tr('Reintentar')}</Button>} />
      );
    }
    return this.props.children;
  }
}
