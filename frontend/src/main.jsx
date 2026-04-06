import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class GlobalErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error) { console.error("Global Error Boundary Caught:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', background: '#111', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{fontSize: '2rem'}}>Fatal App Crash</h2>
          <p style={{fontSize: '1.2rem', margin: '1rem 0'}}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', marginTop: '1rem', color: '#ffaaaa' }}>{this.state.error && this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
        <App />
    </GlobalErrorBoundary>
  </StrictMode>
)
