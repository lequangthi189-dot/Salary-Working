import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useI18n } from "../lib/i18n.jsx";
import LangToggle from "../components/LangToggle.jsx";

const emptySignup = {
  phone: "",
  email: "",
  password: "",
  confirm: "",
};

// Lưu nháp form đăng ký (email + SĐT) để "Quay lại đăng ký" không mất dữ liệu.
// KHÔNG lưu mật khẩu (bảo mật). sessionStorage: tự xoá khi đóng tab.
const SIGNUP_DRAFT = "signup-draft";
function loadSignupDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(SIGNUP_DRAFT) || "{}");
  } catch {
    return {};
  }
}
function saveSignupDraft(s) {
  try {
    sessionStorage.setItem(
      SIGNUP_DRAFT,
      JSON.stringify({ email: s.email, phone: s.phone })
    );
  } catch {
    /* ignore */
  }
}

// Chế độ mở đầu: 'signup' nếu vừa bấm "Quay lại đăng ký" từ form thông tin.
function initialMode() {
  try {
    if (localStorage.getItem("auth-mode") === "signup") {
      localStorage.removeItem("auth-mode");
      return "signup";
    }
  } catch {
    /* ignore */
  }
  return "signin";
}

export default function LoginForm({ onCancel }) {
  const { t } = useI18n();
  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(() => ({
    ...emptySignup,
    ...loadSignupDraft(),
  }));
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function updateSignup(field, value) {
    setSignup((prev) => {
      const next = { ...prev, [field]: value };
      saveSignupDraft(next);
      return next;
    });
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
        ? t("auth.invalidCreds") // Thay thế thông báo lỗi chung chung bằng gợi ý thân thiện hơn.
        : error.message;
      setMessage({ type: "error", text: hint });
    }
    setBusy(false);
  }

  async function handleForgot() {
    const target = email.trim();
    if (!target) {
      setMessage({ type: "error", text: t("auth.enterEmailFirst") });
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
            text: t("auth.resetSent", { email: target }),
          },
    );
    setBusy(false);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setMessage(null);

    // Số điện thoại quốc tế: bỏ khoảng trắng/dấu phân cách, cho phép '+' đầu,
    // còn lại 7–15 chữ số (theo chuẩn E.164 — dùng được cho mọi quốc gia).
    const normalizedPhone = signup.phone.replace(/[\s().-]/g, "");
    if (!/^\+?\d{7,15}$/.test(normalizedPhone)) {
      setMessage({ type: "error", text: t("auth.phoneInvalid") });
      return;
    }

    if (signup.password !== signup.confirm) {
      setMessage({ type: "error", text: t("auth.pwMismatch") });
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: signup.email.trim(),
      password: signup.password,
      options: {
        // Họ tên + mã NV sẽ nhập ở form thông tin nhân viên sau đăng ký.
        data: {
          phone: normalizedPhone,
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
      setMessage({ type: "info", text: t("auth.accountCreatedSignedIn") });
    } else {
      // Email confirmation đang BẬT → thư xác nhận đã được gửi.
      setMessage({
        type: "info",
        text: t("auth.accountCreatedConfirm", { email: signup.email }),
      });
    }
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <div className="auth-top">
        {onCancel && (
          <button
            type="button"
            className="link auth-cancel"
            onClick={onCancel}
          >
            ← {t("common.cancel")}
          </button>
        )}
        <div className="auth-lang">
          <LangToggle />
        </div>
      </div>
      <h1>Salary Working</h1>
      <p className="subtitle">
        {mode === "signin"
          ? t("auth.signInSubtitle")
          : t("auth.signUpSubtitle")}
      </p>

      {mode === "signin" ? (
        <form onSubmit={handleSignin}>
          <label>
            {t("auth.email")}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            {t("auth.password")}
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
                aria-label={showPw ? t("common.hide") : t("common.show")}
              >
                {showPw ? t("common.hide") : t("common.show")}
              </button>
            </div>
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "…" : t("auth.signIn")}
          </button>
          <button
            type="button"
            className="link forgot-link"
            onClick={handleForgot}
            disabled={busy}
          >
            {t("auth.forgot")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignup}>
          <label>
            {t("auth.email")}
            <input
              type="email"
              value={signup.email}
              onChange={(e) => updateSignup("email", e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            {t("auth.phone")}
            <input
              type="tel"
              value={signup.phone}
              onChange={(e) =>
                updateSignup(
                  "phone",
                  e.target.value.replace(/[^\d+\s().-]/g, "")
                )
              }
              required
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="+84 901 234 567"
            />
          </label>
          <label>
            {t("auth.password")}
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
                aria-label={showPw ? t("common.hide") : t("common.show")}
              >
                {showPw ? t("common.hide") : t("common.show")}
              </button>
            </div>
          </label>
          <label>
            {t("auth.confirmPassword")}
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
                aria-label={showPw ? t("common.hide") : t("common.show")}
              >
                {showPw ? t("common.hide") : t("common.show")}
              </button>
            </div>
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "…" : t("auth.signUp")}
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
        {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
      </button>
    </div>
  );
}
