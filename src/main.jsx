import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import AppRouterV3 from './router/AppRouterV3'
import './index.css'
import './system.css'
import './system2.css'
import './system3.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <AppRouterV3 />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>
)
