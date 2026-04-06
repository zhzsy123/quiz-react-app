import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardSplitPage from '../pages/DashboardSplitPage'
import EnglishExamPageV2 from '../pages/EnglishExamPageV2'
import HistoryPageV2 from '../pages/HistoryPageV2'
import LibraryPage from '../pages/LibraryPage'
import WrongBookPage from '../pages/WrongBookPage'

export default function AppRouterV4() {
  return (
    <Routes>
      <Route path="/" element={<DashboardSplitPage />} />
      <Route path="/exam/english" element={<EnglishExamPageV2 />} />
      <Route path="/history" element={<HistoryPageV2 />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/wrong-book" element={<WrongBookPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
