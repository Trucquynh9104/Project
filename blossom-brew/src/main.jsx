import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import {bootstrap} from './services/dataStore'
const root=createRoot(document.getElementById('root'))
async function start(){root.render(<div className="brew-loading" role="status">Đang tải Blossom Brew…</div>);try{await bootstrap();root.render(<StrictMode><BrowserRouter><App/></BrowserRouter></StrictMode>)}catch(e){root.render(<main className="brew-access-denied"><h1>Chưa kết nối được cửa hàng.</h1><p>{e.message}</p><button className="brew-button" onClick={start}>Thử lại</button></main>)}}
start()
