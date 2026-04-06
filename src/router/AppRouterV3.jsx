import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import EnglishExamPage from '../App'
import DashboardSplitPage from '../pages/DashboardSplitPage'
import HistoryPage from '../pages/HistoryPage'
import LibraryPage from '../pages/LibraryPage'

export default function AppRouterV3() {
  return (
    <Routes>
      <Route path="/" element={<DashboardSplitPage />} />
      <Route path="/exam/english" element={<EnglishExamPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
