document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const demoHint = document.getElementById("demoHint");
  const demoAuth = getConfig().demoAuth || { enabled: false };

  if (demoHint && demoAuth.enabled) {
    demoHint.textContent = `Modo demo activo: usuario "${demoAuth.username}" y contraseña "${demoAuth.password}".`;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  function setMessage(text, isError = false) {
    if (!loginMessage) {
      return;
    }

    loginMessage.textContent = text;
    loginMessage.classList.toggle("danger-text", isError);
  }

  function getAuthToken(payload) {
    return (
      payload?.access_token ||
      payload?.token ||
      payload?.data?.access_token ||
      payload?.data?.token ||
      payload?.data?.auth?.access_token ||
      payload?.data?.auth?.token ||
      null
    );
  }

  function getAuthTokenType(payload) {
    return (
      payload?.token_type ||
      payload?.data?.token_type ||
      payload?.data?.auth?.token_type ||
      "Bearer"
    );
  }

  async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      setMessage("Completá usuario y contraseña.", true);
      return;
    }

    setMessage("Verificando credenciales...");

    try {
      const response = await fetch(getApiUrl(getConfig().loginEndpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.detail || "No se pudo iniciar sesión en el backend.");
      }

      const token = getAuthToken(payload);
      const tokenType = getAuthTokenType(payload);

      if (!token) {
        throw new Error("El backend respondió sin token.");
      }

      setSession(token, payload.user?.username || username, tokenType);
      window.location.href = "menu.html";
    } catch (error) {
      if (demoAuth.enabled && username === demoAuth.username && password === demoAuth.password) {
        setSession("demo-token", username);
        window.location.href = "menu.html";
        return;
      }

      const fallbackMsg = demoAuth.enabled
        ? " Login demo disponible con las credenciales indicadas arriba."
        : "";
      setMessage(`${error.message}${fallbackMsg}`, true);
    }
  }
});