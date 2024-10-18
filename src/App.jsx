import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Scene from './Scene';

function App() {

  return (
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<Scene />} />
          <Route path="/:streamid" element={<Scene />} />
        </Routes>
    </BrowserRouter>
  )
}

export default App
