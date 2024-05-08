import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { Model } from './Model.ts'
import './index.css'

const model = new Model()
model.init()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App model={model} />
    </React.StrictMode>,
)
