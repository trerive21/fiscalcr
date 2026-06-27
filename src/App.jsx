import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Facturas from "./pages/Facturas"
import Historial from "./pages/Historial"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/facturas" element={<Facturas />} />
        <Route path="/historial" element={<Historial />} />
      </Routes>
    </BrowserRouter>
  )
}