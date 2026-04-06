import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import AppRouterV2 from './router/AppRouterV2'
import './index.css'
import './system.css'
import './system2.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <AppRouterV2 />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>
)
