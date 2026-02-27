import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    padding: '24px'
                }}>
                    <div style={{
                        textAlign: 'center',
                        maxWidth: '400px',
                        background: '#fff',
                        borderRadius: '24px',
                        padding: '48px 32px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: '#fef2f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            fontSize: '28px'
                        }}>
                            ⚠️
                        </div>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: 900,
                            color: '#0f172a',
                            margin: '0 0 8px',
                            textTransform: 'uppercase',
                            letterSpacing: '-0.5px'
                        }}>
                            Something went wrong
                        </h2>
                        <p style={{
                            fontSize: '13px',
                            color: '#64748b',
                            margin: '0 0 32px',
                            lineHeight: 1.6
                        }}>
                            An unexpected error occurred. Please try refreshing the page or go back to the home screen.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '12px 24px',
                                    background: '#0f172a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '11px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    cursor: 'pointer'
                                }}
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '12px 24px',
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '11px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    cursor: 'pointer'
                                }}
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
