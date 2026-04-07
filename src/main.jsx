import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import AppRouter from './router/AppRouter'
import './index.css'
import './system.css'
import './system2.css'
import './system3.css'
import './system4.css'
import './system5.css'
import './system6.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>
)
