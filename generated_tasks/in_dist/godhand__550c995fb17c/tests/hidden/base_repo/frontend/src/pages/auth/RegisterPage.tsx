import { Navigate } from 'react-router-dom'

export default function RegisterPage() {
  return <Navigate to="/?panel=start&auth=register" replace />
}
