import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom' 
import './index.css'
import App from './App.jsx'

// Removed the fetchData import and call from here.
// Logic like this should live inside your Components (like App.jsx) 
// using the useEffect hook.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter> 
      <App />
    </HashRouter>
  </StrictMode>,
)