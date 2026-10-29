import React from 'react'
import ReactDOM from 'react-dom/client'
// Token + font layers (raw CSS, copied from design_export — the design's own model).
import './theme/fonts.css'
import './theme/tokens.css'
import './theme/base.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
