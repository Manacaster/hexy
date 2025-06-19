// HEXY.PRO App - /app/src/components/Auth.jsx - Component used to authenticate users.
 
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLogin = location.pathname === '/login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = isLogin
        ? await signIn({ email, password })
        : await signUp({ email, password });

      if (result.error) {
        if (result.error.message.includes('Please wait')) {
          setError(result.error.message);
        } else {
          throw result.error;
        }
      } else if (result.user) {
        if (isLogin) {
          navigate('/');
        } else {
          setSuccess('Signup successful! Please check your email for confirmation.');
        }
      } else {
        throw new Error('Unexpected result from authentication');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-8 max-w-md">
      <h1 className="text-3xl font-bold mb-4">{isLogin ? 'Login' : 'Register'}</h1>
      {error && <p className="text-error mb-4">{error}</p>}
      {success && <p className="text-success mb-4">{success}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded"
          required
        />
        <button type="submit" className="w-full btn-primary" disabled={loading}>
          {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
        </button>
      </form>
    </div>
  );
};

export default Auth;