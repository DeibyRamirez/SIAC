'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

import { usarSesion } from '@/components/auth/proveedor-sesion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { rutaInicioPorRol } from '@/lib/auth-mock'

export default function PaginaLogin() {
  const router = useRouter()
  const { sesion, cargando, iniciarSesion } = usarSesion()
  const [correo, setCorreo] = useState('maria.cargadora@uniautonoma.edu.co')
  const [contrasena, setContrasena] = useState('Cargador2026')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!cargando && sesion) {
      router.replace(rutaInicioPorRol(sesion.rol))
    }
  }, [cargando, sesion, router])

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    const mensaje = await iniciarSesion(correo, contrasena)
    if (mensaje) {
      setError(mensaje)
    }
    setEnviando(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-[#102f55] text-white">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="text-xl text-[#102f55]">Iniciar sesión en SIAC</CardTitle>
          <CardDescription>
            Accede con tu correo institucional @uniautonoma.edu.co
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={manejarEnvio}>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-[#102f55]">Correo institucional</span>
              <input
                type="email"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                className="w-full rounded-lg border border-input px-3 py-2 outline-none focus:border-[#3a9c98] focus:ring-2 focus:ring-[#3a9c98]/20"
                placeholder="usuario@uniautonoma.edu.co"
                required
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-[#102f55]">Contraseña</span>
              <input
                type="password"
                value={contrasena}
                onChange={(evento) => setContrasena(evento.target.value)}
                className="w-full rounded-lg border border-input px-3 py-2 outline-none focus:border-[#3a9c98] focus:ring-2 focus:ring-[#3a9c98]/20"
                required
              />
            </label>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Validando...' : 'Ingresar'}
            </Button>
          </form>
          <div className="mt-6 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-[#102f55]">Cuentas de demostración</p>
            <p>Cargador: maria.cargadora@uniautonoma.edu.co / Cargador2026</p>
            <p>Revisor: revisor.calidad@uniautonoma.edu.co / Revisor2026</p>
            <p>Administrador: admin.planeacion@uniautonoma.edu.co / Admin2026</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
