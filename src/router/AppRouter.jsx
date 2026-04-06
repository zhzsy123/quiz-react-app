import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import EnglishExamPage from '../App'
import DashboardPage from '../pages/DashboardPage'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/exam/english" element={<EnglishExamPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
