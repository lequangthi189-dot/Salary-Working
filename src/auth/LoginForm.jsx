import { useState } from "react";
import { supabase } from "../lib/supabase.js";

const emptySignup = {
  fullName: "",
  employeeCode: "",
  phone: "",
  email: "",
  password: "",
  confirm: "",
};

export default function LoginForm() {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(emptySignup);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function updateSignup(field, value) {
    setSignup((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSignin(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      const hint = /invalid login credentials/i.test(error.message)
        ? "Sai email hoặc mật khẩu." // Thay thế thông báo lỗi chung chung bằng gợi ý thân thiện hơn.
        : error.message;
      setMessage({ type: "error", text: hint });
    }
    setBusy(false);
  }

  async function handleForgot() {
    const target = email.trim();
    if (!target) {
      setMessage({ type: "error", text: "Nhập email phía trên trước đã." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: window.location.origin,
    });
    setMessage(
      error
        ? { type: "error", text: error.message }
        : {
            type: "info",
            text: `Đã gửi link đặt lại mật khẩu tới ${target}. Mở email và bấm vào link.`,
          },
    );
    setBusy(false);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setMessage(null);

    if (!/^\d{9}$/.test(signup.employeeCode.trim())) {
      setMessage({
        type: "error",
        text: "Mã nhân viên phải gồm đúng 9 chữ số (vd: 000000000).",
      });
      return;
    }

    if (signup.password !== signup.confirm) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: signup.email.trim(),
      password: signup.password,
      options: {
        // Lưu họ tên + mã nhân viên + số điện thoại vào user_metadata.
        data: {
          full_name: signup.fullName,
          employee_code: signup.employeeCode.trim(),
          phone: signup.phone,
        },
        // Link xác nhận trong email sẽ quay về app sau khi bấm.
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else if (data.session) {
      // Email confirmation đang TẮT trên Supabase → user đăng nhập luôn,
      // không có thư xác nhận nào được gửi.
      setMessage({
        type: "info",
        text: "Account created and signed in. (Email confirmation is disabled on the server, so no email was sent.)",
      });
    } else {
      // Email confirmation đang BẬT → thư xác nhận đã được gửi.
      setMessage({
        type: "info",
        text: `Account created. We sent a confirmation link to ${signup.email}. Open it to activate your account.`,
      });
    }
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <h1>Salary Working</h1>
      <p className="subtitle">
        {mode === "signin" ? "Sign in to your timesheet" : "Create an account"}
      </p>

      {mode === "signin" ? (
        <form onSubmit={handleSignin}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <div className="pw-wrap">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "…" : "Sign in"}
          </button>
          <button
            type="button"
            className="link forgot-link"
            onClick={handleForgot}
            disabled={busy}
          >
            Quên mật khẩu?
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignup}>
          <label>
            Full name
            <input
              type="text"
              value={signup.fullName}
              onChange={(e) => updateSignup("fullName", e.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label>
            Mã nhân viên (9 chữ số)
            <input
              type="text"
              value={signup.employeeCode}
              onChange={(e) =>
                updateSignup(
                  "employeeCode",
                  e.target.value.replace(/\D/g, "").slice(0, 9)
                )
              }
              required
              inputMode="numeric"
              pattern="\d{9}"
              maxLength={9}
              placeholder="000000000"
            />
          </label>
          <label>
            Phone number
            <input
              type="tel"
              value={signup.phone}
              onChange={(e) => updateSignup("phone", e.target.value)}
              required
              autoComplete="tel"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={signup.email}
              onChange={(e) => updateSignup("email", e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <div className="pw-wrap">
              <input
                type={showPw ? "text" : "password"}
                value={signup.password}
                onChange={(e) => updateSignup("password", e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <label>
            Confirm password
            <div className="pw-wrap">
              <input
                type={showPw ? "text" : "password"}
                value={signup.confirm}
                onChange={(e) => updateSignup("confirm", e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "…" : "Sign up"}
          </button>
        </form>
      )}

      {message && <p className={`msg ${message.type}`}>{message.text}</p>}

      <button
        type="button"
        className="link"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage(null);
        }}
      >
        {mode === "signin"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
