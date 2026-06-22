import { Link } from 'react-router-dom'

export default function VerifySuccessPage() {
  return (
    <main>
      <h1>Email verified successfully.</h1>
      <p>Your account is ready. You can log in now.</p>
      <p>
        <Link to="/">Go to login</Link>
      </p>
    </main>
  )
}
