import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProvider } from './providers/AppContext'
import AppRouter from './router/AppRouter'
import './styles/index.css'
import './styles/system.css'
import './styles/system2.css'
import './styles/system3.css'
import './styles/system4.css'
import './styles/system5.css'
import './styles/system6.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </HashRouter>
  </React.StrictMode>
)
