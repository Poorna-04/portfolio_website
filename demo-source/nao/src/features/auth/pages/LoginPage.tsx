import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../../../api/client'
import { FormError } from '../../../components/form/FormError'
import { TextField } from '../../../components/form/TextField'
import { useAuth } from '../hooks/useAuth'
import { loginSchema, type LoginForm } from '../schemas/authSchemas'
import { applyServerErrors } from '../utils/applyServerErrors'
import { homePathFor } from '../utils/homePathFor'
import { DemoAccounts } from '../../../demo/DemoAccounts'

type LocationState = { from?: string; registered?: boolean; verified?: boolean } | null

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const state = useLocation().state as LocationState
  /** set when the server says the email still needs its code */
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>()

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  if (user) return <Navigate to={homePathFor(user.role)} replace />

  const onSubmit = async (values: LoginForm) => {
    setUnverifiedEmail(undefined)
    try {
      const loggedIn = await login(values.email, values.password)
      navigate(state?.from ?? homePathFor(loggedIn.role), { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(values.email.trim())
        return
      }
      applyServerErrors(error, setError, ['email', 'password'])
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Log in</h1>
      {(state?.registered || state?.verified) && (
        <p className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.verified ? 'Email verified. Please log in.' : 'Account created. Please log in.'}
        </p>
      )}
      {unverifiedEmail && (
        <div role="alert" className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Please verify your email first.{' '}
          <Link to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`} className="font-medium underline">
            Enter the 6-digit code
          </Link>{' '}
          we emailed you.
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormError message={errors.root?.message} />
        <TextField label="Email" type="email" autoComplete="email" required
          registration={register('email')} error={errors.email?.message} />
        <TextField label="Password" type="password" autoComplete="current-password" required
          registration={register('password')} error={errors.password?.message} />
        <button type="submit" disabled={isSubmitting}
          className="w-full rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50">
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        New here? <Link to="/register" className="text-slate-900 underline">Create an account</Link>
      </p>
      <DemoAccounts onPick={(email) => { setValue('email', email); setValue('password', 'Demo@1234') }} />
    </main>
  )
}
