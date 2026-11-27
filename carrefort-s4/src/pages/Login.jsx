import "./Login.css";
import { useState } from "react";
import { supabase } from "../services/supabase";

function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
    });

    setLoading(false);

    if (error) {
        setError("E-mail ou senha incorretos. Verifique seus dados.");
        return;
    }

    window.location.href = "/admin";
    }

return (
  <main className="login-page">
    <div className="login-wrapper">
      <section className="brand-section">
        <div className="brand-logo">
          <div className="brand-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <span>Carrefort</span>
        </div>

        <h1 className="brand-headline">
          Menos desperdício,
          <br />
          <span>mais sustentabilidade.</span>
        </h1>

        <p className="brand-description">
          Cada produto controlado é comida que não vai para o lixo.
        </p>

        <div className="brand-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>Controle de validade para supermercados</span>
        </div>
      </section>

      <section className="login-card">
        <a href="/" className="btn-back-offers">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
            <path d="M20 12H9" />
          </svg>

          Voltar para ofertas
        </a>
        <div className="lock-badge">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm3 8.73V17a1 1 0 1 1-2 0v-1.27a2 2 0 1 1 2 0Z" />
          </svg>
        </div>

        <h2 className="card-title">Acesse sua conta</h2>
        <p className="card-subtitle">
          Gestão inteligente de alimentos
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              E-mail
            </label>

            <div className="input-wrapper">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </span>

              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="senha">
              Senha
            </label>

            <div className="input-wrapper">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7.5" cy="15.5" r="4.5" />
                  <path d="m21 2-9.6 9.6" />
                  <path d="m15.5 7.5 3 3L22 7l-3-3" />
                </svg>
              </span>

              <input
                type="password"
                id="senha"
                className="form-input"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            <span>{loading ? "Entrando..." : "Entrar"}</span>

            {!loading && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            )}
          </button>
        </form>

        <div className="employee-notice">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm4.5 11h-9v-.75c0-1.66 2.24-2.75 4.5-2.75s4.5 1.09 4.5 2.75V17Z" />
          </svg>
          <span>Acesso exclusivo para funcionários</span>
        </div>
      </section>
    </div>
  </main>
);
}

export default Login;
