import { Eye, EyeOff, Lock, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { bookingService, type SessionStatus } from '../../services/bookingService';

export function AdminLogin({
  mode,
  onSuccess,
}: {
  mode: 'supabase' | 'demo';
  onSuccess: (session: SessionStatus) => void;
}) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('sgdcjuniorskz6@gmail.com');
  const [password, setPassword] = useState('AdminPassword2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await bookingService.signInAdmin(email, password);
      onSuccess(session);
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_ADMIN') {
        setError(t.admin.authErrorNotAdmin);
      } else {
        setError(t.admin.authErrorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="rounded-2xl border border-[#E8E5DF] bg-white p-8 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3F1EC] text-[#8C5E3C]">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-5 font-serif text-3xl font-medium text-[#1C1B18]">
          {t.admin.loginTitle}
        </h1>
        <p className="mt-2 text-sm text-[#6B6860]">
          {mode === 'demo' ? t.admin.loginDemoSubtitle : t.admin.loginSubtitle}
        </p>

        {mode === 'demo' ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-900">
              {t.admin.demoBanner}
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const s = await bookingService.signInAdmin('', '');
                onSuccess(s);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1C1B18] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#8C5E3C]"
            >
              <Sparkles className="h-4 w-4" />
              {t.admin.signInDemo}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs leading-relaxed text-emerald-950">
              <span className="font-semibold text-emerald-900">Supabase подключен:</span> Учётная запись администратора заполнена. Нажмите «{t.admin.signIn}» для входа и управления записями из публичной БД.
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#1C1B18]">
                {t.admin.email}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-4 py-2.5 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#1C1B18]">
                {t.admin.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-4 py-2.5 pr-10 text-sm outline-none focus:border-[#8C5E3C] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-[#6B6860] hover:text-[#1C1B18]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#1C1B18] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#8C5E3C] disabled:opacity-50"
            >
              {t.admin.signIn}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

