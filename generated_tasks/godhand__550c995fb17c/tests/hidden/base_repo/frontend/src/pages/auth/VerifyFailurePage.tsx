import { Link } from 'react-router-dom'
import ShaderBackdrop from '../game/components/ShaderBackdrop'

export default function VerifyFailurePage() {
  return (
    <main className="auth-shell auth-center-shell">
      <ShaderBackdrop />
      <section className="auth-message-panel">
        <h1 className="auth-title">Email verification is currently disabled.</h1>
        <p className="auth-subtitle">Use login or Google sign-in from the landing page.</p>
        <p className="auth-subtitle">
          <Link to="/?panel=start" className="ui-link">
            Return to start
          </Link>
        </p>
      </section>
    </main>
  )
}
