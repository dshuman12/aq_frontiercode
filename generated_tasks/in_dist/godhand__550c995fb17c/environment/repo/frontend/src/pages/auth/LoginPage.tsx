import { Navigate } from 'react-router-dom'

export default function LoginPage() {
  return <Navigate to="/?panel=start&auth=login" replace />
}
