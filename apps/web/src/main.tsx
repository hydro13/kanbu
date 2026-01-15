import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { store } from './store'
import { trpc, trpcClient, queryClient } from './lib/trpc'
import { SocketProvider } from './contexts/SocketContext'
import { ThemeProviderWithAuth } from './components/theme'
import App from './App'
import './styles/globals.css'
import './styles/accents.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProviderWithAuth>
            <SocketProvider>
              <App />
            </SocketProvider>
          </ThemeProviderWithAuth>
        </QueryClientProvider>
      </trpc.Provider>
    </Provider>
  </React.StrictMode>,
)
