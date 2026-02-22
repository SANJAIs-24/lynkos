import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom' 
import './index.css'
import App from './App.jsx'
import { fetchData } from './tunnel.js';

fetchData('your-endpoint').then(data => console.log(data));
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter> 
      <App />
    </HashRouter>
  </StrictMode>,
)