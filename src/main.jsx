import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import AppRouter from './router/AppRouter'
import './index.css'
import './system.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>
)
