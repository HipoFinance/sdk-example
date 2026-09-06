import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { Model } from './Model.ts'
import './index.css'

const model = new Model()
model.init()

const container = document.getElementById('root')
if (container == null) {
    throw new Error('No #root element to mount into')
}

ReactDOM.createRoot(container).render(
    <React.StrictMode>
        <App model={model} />
    </React.StrictMode>,
)
