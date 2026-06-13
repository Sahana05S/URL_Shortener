import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [event.target.name]: undefined,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (isSignup) await signup(form);
      else await login({ email: form.email, password: form.password });
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
      setFieldErrors(requestError.fields || {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-aside">
        <Brand />
        <div>
          <p className="section-kicker">Your links, understood</p>
          <h1>Turn every shared link into a useful signal.</h1>
          <p>
            Create polished short links and follow their performance from one
            focused workspace.
          </p>
        </div>
        <p className="auth-quote">
          Built with privacy-aware analytics and secure account isolation.
        </p>
      </section>
      <section className="auth-main">
        <div className="auth-card">
          <Link className="back-link" to="/">
            <ArrowLeft size={17} /> Back home
          </Link>
          <p className="section-kicker">
            {isSignup ? "Start free" : "Welcome back"}
          </p>
          <h2>{isSignup ? "Create your account" : "Log in to Linkora"}</h2>
          <p className="auth-intro">
            {isSignup
              ? "No credit card. Your first short link is moments away."
              : "Continue managing your links and analytics."}
          </p>

          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <FormField
                error={fieldErrors.name?.[0]}
                label="Name"
                name="name"
                onChange={updateField}
                placeholder="Your name"
                value={form.name}
              />
            )}
            <FormField
              error={fieldErrors.email?.[0]}
              label="Email address"
              name="email"
              onChange={updateField}
              placeholder="you@example.com"
              type="email"
              value={form.email}
            />
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="password-input">
                <input
                  aria-describedby={
                    fieldErrors.password ? "password-error" : undefined
                  }
                  aria-invalid={Boolean(fieldErrors.password)}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  id="password"
                  name="password"
                  onChange={updateField}
                  placeholder={
                    isSignup ? "At least 10 characters" : "Your password"
                  }
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="field-error" id="password-error">
                  {fieldErrors.password[0]}
                </span>
              )}
            </div>
            <button
              className="button button-primary auth-submit"
              disabled={submitting}
            >
              {submitting
                ? "Please wait..."
                : isSignup
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "New to Linkora?"}{" "}
            <Link to={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function FormField({ error, label, name, type = "text", ...inputProps }) {
  const errorId = `${name}-error`;
  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <input
        {...inputProps}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={name}
        id={name}
        name={name}
        type={type}
      />
      {error && (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
}
