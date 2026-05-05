import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState<string>("admin");
  const [password, setPassword] = useState<string>("contraseña123");
  const [error, setError] = useState<string>("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError("");

    try {
      await login(username, password);
      navigate("/");
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("No se pudo iniciar sesión");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-orange-100 bg-white/90 p-6 shadow-lg backdrop-blur">
        <h1 className="mb-4 text-2xl font-bold text-orange-900">Login</h1>
        <label className="mb-3 block text-sm font-medium text-orange-900">
          Usuario
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1 w-full rounded border border-orange-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            placeholder="admin"
          />
        </label>
        <label className="mb-3 block text-sm font-medium text-orange-900">
          Clave
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-orange-200 px-3 py-2 focus:border-orange-400 focus:outline-none"
            placeholder="1234"
          />
        </label>
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <p className="mb-3 text-xs text-orange-700">Usuario de prueba: admin | Clave: contraseña123</p>
        <button type="submit" className="w-full rounded bg-orange-500 px-3 py-2 font-medium text-white shadow-sm">
          Ingresar
        </button>
      </form>
    </div>
  );
}
