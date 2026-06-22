import { Link } from 'react-router-dom'

export default function VerifyFailurePage() {
  return (
    <main>
      <h1>Verification link is invalid or expired.</h1>
      <p>Please request a new verification email by registering again.</p>
      <p>
        <Link to="/register">Go to register</Link>
      </p>
      <p>
        <Link to="/">Go to login</Link>
      </p>
    </main>
  )
}
