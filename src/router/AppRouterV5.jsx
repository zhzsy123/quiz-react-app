import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardSplitPage from '../pages/DashboardSplitPage'
import FileHubPage from '../pages/FileHubPage'
import CleanWorkspacePage from '../pages/CleanWorkspacePage'
import HistoryPageV2 from '../pages/HistoryPageV2'
import WrongBookPage from '../pages/WrongBookPage'
import FavoritesPage from '../pages/FavoritesPage'

const AppRouterV5 = () => (
  <Routes>
    <Route path="/" element={<DashboardSplitPage />} />
    <Route path="/exam" element={<Navigate to="/exam/english" replace />} />
    <Route path="/workspace" element={<Navigate to="/workspace/english" replace />} />
    <Route path="/exam/:subjectParam" element={<FileHubPage />} />
    <Route path="/workspace/:subjectParam" element={<CleanWorkspacePage />} />
    <Route path="/history" element={<HistoryPageV2 />} />
    <Route path="/wrong-book" element={<WrongBookPage />} />
    <Route path="/favorites" element={<FavoritesPage />} />
    <Route path="/library" element={<Navigate to="/exam/english" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default AppRouterV5
