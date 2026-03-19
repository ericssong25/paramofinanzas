import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import { Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : signInError.message);
        return;
      }

      onLoginSuccess();
    } catch {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Finanzas Páramo</h1>
            <p className="text-gray-500 mt-1 text-sm">Acceso administrativo</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-1">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              required
              placeholder="admin@ejemplo.com"
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mt-6">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
