import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import AppRouterV4 from './router/AppRouterV4'
import './index.css'
import './system.css'
import './system2.css'
import './system3.css'
import './system4.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <AppRouterV4 />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>
)
