import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Facturas from "./pages/Facturas"
import Historial from "./pages/Historial"
import Clientes from "./pages/Clientes"
import Articulos from "./pages/Articulos"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/facturas" element={<Facturas />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/articulos" element={<Articulos />} />
      </Routes>
    </BrowserRouter>
  )
}