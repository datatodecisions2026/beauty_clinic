import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useEffect } from "react"
import { Navbar } from "./components/Navbar"
import { ProtectedRoute } from "./components/ProtectedRoute"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Bookings from "./pages/Bookings"
import Appointments from "./pages/Appointments"
import Reviews from "./pages/Reviews"
import Admin from "./pages/Admin"
import AssistantLogin from "./pages/AssistantLogin"
import About from "./pages/About"
import Preloader from "./components/Preloader"
import ErrorBoundary from "./components/ErrorBoundary"
import ClickSpark from "./components/ClickSpark"

const queryClient = new QueryClient()

function PageWrapper({ children }) {
  const { pathname } = useLocation()
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
    </motion.div>
  )
}

function ScrollReset() {
  const location = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClickSpark sparkColor="#C5A880" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
      <BrowserRouter>
        <ScrollReset />
        <Preloader />
        <Routes>
          <Route path="/assistant" element={<AssistantLogin />} />
          <Route path="*" element={
            <>
              <Navbar />
              <main className="app-main">
                <Routes>
                  <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
                  <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
                  <Route path="/signup" element={<PageWrapper><Signup /></PageWrapper>} />
                  <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
                  <Route path="/reviews" element={<PageWrapper><Reviews /></PageWrapper>} />
                  <Route path="/bookings" element={<PageWrapper><ProtectedRoute><Bookings /></ProtectedRoute></PageWrapper>} />
                  <Route path="/appointments" element={<PageWrapper><ProtectedRoute><Appointments /></ProtectedRoute></PageWrapper>} />
                  <Route path="/admin" element={<PageWrapper><Admin /></PageWrapper>} />
                </Routes>
              </main>
            </>
          } />
        </Routes>
      </BrowserRouter>
      </ClickSpark>
    </QueryClientProvider>
  )
}
