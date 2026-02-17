import React from 'react'
import ReactDOM from 'react-dom/client'
import ShowcaseApp from '../../../products/showcase/ui-entry/App'
import TemplateApp from '../../../products/template/ui-entry/App'

const App = import.meta.env.VITE_PRODUCT === 'showcase' ? ShowcaseApp : TemplateApp

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
