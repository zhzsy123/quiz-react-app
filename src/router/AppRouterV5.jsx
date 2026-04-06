import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardSplitPage from '../pages/DashboardSplitPage'
import FileHubPage from '../pages/FileHubPage'
import CleanWorkspacePage from '../pages/CleanWorkspacePage'
import HistoryPageV2 from '../pages/HistoryPageV2'
import WrongBookPage from '../pages/WrongBookPage'
import FavoritesPage from '../pages/FavoritesPage'

export default function AppRouterV5() {
  return (
    <Routes>
      <Route path="/" element={<DashboardSplitPage />} />
      <Route path="/exam/english" element={<FileHubPage />} />
      <Route path="/workspace/english" element={<CleanWorkspacePage />} />
      <Route path="/history" element={<HistoryPageV2 />} />
      <Route path="/wrong-book" element={<WrongBookPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/library" element={<Navigate to="/exam/english" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
