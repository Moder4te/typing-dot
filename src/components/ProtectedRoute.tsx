import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

// Gate for member-only routes. When Supabase isn't configured yet (fresh clone),
// we let the route render so the app stays usable locally.
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { configured, loading, session } = useAuth()
  const location = useLocation()

  if (!configured) return <>{children}</>
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: '#fafafa', color: 'rgba(0,0,0,0.3)', fontSize: 13,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}>
        불러오는 중…
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}
