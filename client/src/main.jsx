import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/chakra-petch/thai-400.css'
import '@fontsource/chakra-petch/thai-500.css'
import '@fontsource/chakra-petch/thai-600.css'
import '@fontsource/chakra-petch/thai-700.css'
import '@fontsource/chakra-petch/latin-400.css'
import '@fontsource/chakra-petch/latin-500.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import './index.css'
import App from './AppV2.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
