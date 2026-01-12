import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { MainLayout } from './components/MainLayout'
import { useSettingsStore } from './store'


import { HomeScreen } from './screens/HomeScreen'
import { QuestionBankScreen } from './screens/QuestionBankScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { ReviewExamScreen } from './screens/ReviewExamScreen'
import { ProgressDashboardScreen } from './screens/ProgressDashboardScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { CreateQuestionScreen } from './screens/CreateQuestionScreen'
import { QuestionDetailScreen } from './screens/QuestionDetailScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { ExamScreen } from './screens/ExamScreen'
import { PracticeSelectionScreen } from './screens/PracticeSelectionScreen'
import { ExamSelectionScreen } from './screens/ExamSelectionScreen'
import { ManageExamsScreen } from './screens/ManageExamsScreen'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

// Placeholder components


import { PropertySettingsScreen } from './screens/PropertySettingsScreen'
import { UserGuideScreen } from './screens/UserGuideScreen'
import { db } from './db'

const App = () => {
  const { darkMode, primaryColor, initialized, setInitialized, fontScale, backgroundUpdateTrigger, fontFamily } = useSettingsStore();

  // Auto Import
  // Auto Import
  useEffect(() => {
    // User requested to disable auto-import of problem sets.
    // We just mark as initialized to proceed.
    if (!initialized) {
      setInitialized(true);
    }
  }, [initialized]);

  // Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Primary Color
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--primary-light', `${primaryColor}aa`);
    document.documentElement.style.setProperty('--primary-dark', `${primaryColor}dd`);
  }, [primaryColor]);

  // Font Scale (Global)
  useEffect(() => {
    // Determine base size. Tailwind base is usually 16px (1rem).
    // If we set root font-size to 100% * scale, it scales everything using rem.
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
  }, [fontScale]);

  // Font Family (Global)
  useEffect(() => {
    document.body.style.fontFamily = fontFamily;
    // Also set input/button fonts if needed, but inheriting from body is standard
    // Tailwind might override, so we might need to set it on #root or specific classes if needed.
    // For now, body is good.
    document.documentElement.style.fontFamily = fontFamily;
  }, [fontFamily]);

  // Background Image
  useEffect(() => {
    let url: string | null = null;
    const loadBg = async () => {
      try {
        const asset = await db.appAssets.get('background');
        if (asset && asset.data) {
          if (asset.data instanceof Blob) {
            url = URL.createObjectURL(asset.data);
            document.body.style.backgroundImage = `url('${url}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundRepeat = 'no-repeat';
          }
        } else {
          document.body.style.backgroundImage = '';
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadBg();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [backgroundUpdateTrigger]);

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/bank" element={<QuestionBankScreen />} />
          <Route path="/bank/:subjectId" element={<QuestionDetailScreen />} />
          <Route path="/practice" element={<PracticeSelectionScreen />} />
          <Route path="/practice/:subjectId" element={<PracticeScreen />} />
          <Route path="/exam" element={<ExamSelectionScreen />} />
          <Route path="/exam/run" element={<ExamScreen />} />
          <Route path="/exam/:subjectId" element={<ExamScreen />} />
          <Route path="/manage-exams" element={<ManageExamsScreen />} />
          <Route path="/review/:resultId" element={<ReviewExamScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/progress" element={<ProgressDashboardScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/properties" element={<PropertySettingsScreen />} />
          <Route path="/create" element={<CreateQuestionScreen />} />
          <Route path="/edit/:id" element={<CreateQuestionScreen />} />
          <Route path="/guide" element={<UserGuideScreen />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
