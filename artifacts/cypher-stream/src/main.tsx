import { createRoot } from 'react-dom/client';

import { setBaseUrl } from '@workspace/api-client-react';
import App from './App';
import { appConfig } from './app/config';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// Keep API endpoint configuration outside pages/components. When no base URL
// is configured, the generated client continues to use same-origin /api paths.
setBaseUrl(appConfig.apiBaseUrl ?? null);

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
