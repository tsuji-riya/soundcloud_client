import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, BaseStyles } from '@primer/react'
import '@primer/primitives/dist/css/primitives.css'
import '@primer/primitives/dist/css/functional/themes/light.css'
import '@primer/primitives/dist/css/functional/themes/dark.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider colorMode="auto">
    <BaseStyles>
      <App />
    </BaseStyles>
  </ThemeProvider>,
)
