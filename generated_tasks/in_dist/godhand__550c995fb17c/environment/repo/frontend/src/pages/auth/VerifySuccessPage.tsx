import { Link } from 'react-router-dom'
import ShaderBackdrop from '../game/components/ShaderBackdrop'

export default function VerifySuccessPage() {
  return (
    <main className="auth-shell auth-center-shell">
      <ShaderBackdrop />
      <section className="auth-message-panel">
        <h1 className="auth-title">Email verified successfully.</h1>
        <p className="auth-subtitle">
          Your account is ready. You can log in now.
        </p>
        <p className="auth-subtitle">
          <Link to="/?panel=start" className="ui-link">
            Return to start
          </Link>
        </p>
      </section>
    </main>
  )
}
