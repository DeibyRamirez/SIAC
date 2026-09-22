'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

import { TarjetaCredencialesDemo } from '@/components/auth/tarjeta-credenciales-demo'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { rutaInicioPorRol } from '@/lib/auth-mock'

function IconoGoogle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export default function PaginaLogin() {
  const router = useRouter()
  const { sesion, cargando, iniciarSesion } = usarSesion()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
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

  function manejarGoogle() {
    toast.info('El inicio de sesión con Google estará disponible en la versión institucional.')
  }

  function manejarOlvidoContrasena() {
    toast.message('Recuperación de contraseña', {
      description:
        'Contacta al área de tecnología institucional para restablecer tu acceso @uniautonoma.edu.co.',
    })
  }

  return (
    <div className="fondo-app min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-center gap-8 lg:flex-row lg:items-center">
        <div className="tarjeta-visual mx-auto w-full max-w-[420px] shrink-0 overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-primary to-cyan-tecnico px-8 py-4 text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-white/80 uppercase">Sistema SIAC</p>
            <p className="text-sm font-extrabold text-white">Calidad académica CUAC</p>
          </div>
          <div className="flex justify-center px-8 pt-6 pb-2">
            <Image
              src="/logo-uniautonoma.png"
              alt="Corporación Universitaria Autónoma del Cauca"
              width={200}
              height={120}
              priority
              className="h-auto w-[200px] object-contain"
            />
          </div>

          <form className="space-y-0 px-8 pb-4" onSubmit={manejarEnvio}>
            <input
              id="correo-institucional"
              type="email"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              placeholder="Correo institucional"
              autoComplete="email"
              className="mb-3 w-full rounded-lg border border-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              required
            />
            <input
              id="contrasena"
              type="password"
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              className="mb-4 w-full rounded-lg border border-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              required
            />

            {error && (
              <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-70"
            >
              {enviando ? 'Validando acceso…' : 'Acceder'}
            </button>

            <button
              type="button"
              onClick={manejarOlvidoContrasena}
              className="mt-3 block text-sm text-cyan-tecnico hover:underline"
            >
              ¿Olvidó su contraseña?
            </button>
          </form>

          <div className="px-8 pb-6">
            <p className="mb-3 text-center text-sm italic text-muted-foreground">
              Identifíquese usando su cuenta en:
            </p>
            <button
              type="button"
              onClick={manejarGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <IconoGoogle />
              Google
            </button>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary"
            >
              Español - Internacional (es)
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() =>
                toast.message('Aviso de cookies', {
                  description:
                    'Este prototipo SIAC utiliza almacenamiento local del navegador para simular la sesión.',
                })
              }
              className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              Aviso de Cookies
            </button>
          </div>
        </div>

        <TarjetaCredencialesDemo />
      </div>

      <footer className="footer-institucional mt-10">
        www.uniautonoma.edu.co
      </footer>
    </div>
  )
}
