import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function ResetPassword() {
  const [paso, setPaso] = useState("solicitar")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")
  const [token, setToken] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get("token")
    if (t) {
      setToken(t)
      verificarToken(t)
    }
  }, [])

  const verificarToken = async (t) => {
    setLoading(true)
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verificar", token: t })
      })
      const data = await res.json()
      if (data.ok) {
        setPaso("cambiar")
      } else {
        setError("El enlace es inválido o ya expiró. Solicitá uno nuevo.")
        setPaso("solicitar")
      }
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const solicitarReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "solicitar", email })
      })
      const data = await res.json()
      if (data.ok) {
        setPaso("enviado")
        setMensaje("Si el correo está registrado recibirás las instrucciones en tu bandeja de entrada.")
      }
    } catch (err) {
      setError("Error de conexión, intente de nuevo")
    } finally {
      setLoading(false)
    }
  }

  const cambiarPassword = async (e) => {
    e.preventDefault()
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cambiar", token, password })
      })
      const data = await res.json()
      if (data.ok) {
        setPaso("listo")
        setMensaje("¡Contraseña actualizada exitosamente!")
      } else {
        setError(data.error || "Error al cambiar contraseña")
      }
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700">FiscalCR</h1>
          <p className="text-gray-500 mt-1">
            {paso === "solicitar" && "Recuperar contraseña"}
            {paso === "enviado" && "Correo enviado"}
            {paso === "cambiar" && "Nueva contraseña"}
            {paso === "listo" && "¡Listo!"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
            {mensaje}
          </div>
        )}

        {/* PASO 1: Solicitar */}
        {paso === "solicitar" && (
          <form onSubmit={solicitarReset} className="space-y-4">
            <p className="text-sm text-gray-500">
              Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
            <p onClick={() => navigate("/")} className="text-center text-sm text-blue-600 cursor-pointer hover:underline">
              ← Volver al login
            </p>
          </form>
        )}

        {/* PASO 2: Enviado */}
        {paso === "enviado" && (
          <div className="text-center space-y-4">
            <div className="text-5xl mb-4">📧</div>
            <p className="text-gray-600 text-sm">{mensaje}</p>
            <p className="text-gray-400 text-xs">Revisá también tu carpeta de spam.</p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition mt-4">
              Volver al login
            </button>
          </div>
        )}

        {/* PASO 3: Cambiar contraseña */}
        {paso === "cambiar" && (
          <form onSubmit={cambiarPassword} className="space-y-4">
            <p className="text-sm text-gray-500">Ingresá tu nueva contraseña.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        )}

        {/* PASO 4: Listo */}
        {paso === "listo" && (
          <div className="text-center space-y-4">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-green-700 font-medium">{mensaje}</p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition mt-4">
              Ir al login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}