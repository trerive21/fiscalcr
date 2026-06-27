import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Facturas from "./pages/Facturas"
import Historial from "./pages/Historial"
import Clientes from "./pages/Clientes"
import Articulos from "./pages/Articulos"
import Proformas from "./pages/Proformas"
import Recibos from "./pages/Recibos"
import ResetPassword from "./pages/ResetPassword"

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
        <Route path="/proformas" element={<Proformas />} />
        <Route path="/recibos" element={<Recibos />} />
        <Route path="/reset" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  )
}