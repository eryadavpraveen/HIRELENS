import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { store, persistor } from '@/app/store'
import AppRoutes from '@/routes/AppRoutes'
import { AuthBootstrap } from '@/components/auth/AuthBootstrap'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ThemeProvider } from '@/hooks/useTheme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Provider store={store}>
          <PersistGate loading={<PageLoader />} persistor={persistor}>
            <AuthBootstrap>
              <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    <AppRoutes />
                  </Suspense>
                </BrowserRouter>
              </QueryClientProvider>
            </AuthBootstrap>
          </PersistGate>
        </Provider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
