import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  getAuthErrorMessage,
  getAuthValidationErrors,
  register,
} from '../../lib/authApi'

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
}

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setErrorMessage('')
    setValidationErrors([])
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const result = await register(form)
      setSuccessMessage(result.message)
      setForm(initialForm)
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
      setValidationErrors(getAuthValidationErrors(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <h1>Register</h1>
      <form onSubmit={onSubmit}>
        <div>
          <label htmlFor="register-first-name">First Name</label>
          <input
            id="register-first-name"
            type="text"
            value={form.first_name}
            onChange={(event) =>
              setForm((current) => ({ ...current, first_name: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <label htmlFor="register-last-name">Last Name</label>
          <input
            id="register-last-name"
            type="text"
            value={form.last_name}
            onChange={(event) =>
              setForm((current) => ({ ...current, last_name: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            required
          />
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
      </form>

      {errorMessage ? <p>{errorMessage}</p> : null}
      {validationErrors.length > 0 ? (
        <ul>
          {validationErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      {successMessage ? <p>{successMessage}</p> : null}

      <p>
        Already have an account? <Link to="/">Login</Link>
      </p>
    </main>
  )
}
