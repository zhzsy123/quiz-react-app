import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardSplitPage from '../../pages/DashboardSplitPage'
import FileHubPage from '../../pages/FileHubPage'
import SubjectWorkspacePage from '../../pages/SubjectWorkspacePage'
import HistoryPage from '../../pages/HistoryPage'
import WrongBookPage from '../../pages/WrongBookPage'
import FavoritesPage from '../../pages/FavoritesPage'

const AppRouter = () => (
  <Routes>
    <Route path="/" element={<DashboardSplitPage />} />
    <Route path="/exam" element={<Navigate to="/exam/english" replace />} />
    <Route path="/workspace" element={<Navigate to="/workspace/english" replace />} />
    <Route path="/exam/:subjectParam" element={<FileHubPage />} />
    <Route path="/workspace/:subjectParam" element={<SubjectWorkspacePage />} />
    <Route path="/history" element={<HistoryPage />} />
    <Route path="/wrong-book" element={<WrongBookPage />} />
    <Route path="/favorites" element={<FavoritesPage />} />
    <Route path="/library" element={<Navigate to="/exam/english" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default AppRouter
