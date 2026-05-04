window.FOOD_STORE_CONFIG = {
  apiBaseUrl: "http://127.0.0.1:8000",
  loginEndpoint: "/login",
  tokenStorageKey: "food_store_token",
  tokenTypeStorageKey: "food_store_token_type",
  userStorageKey: "food_store_user",
  demoAuth: {
    enabled: true,
    username: "admin",
    password: "admin123",
  },
};

function getConfig() {
  return window.FOOD_STORE_CONFIG;
}

function getApiUrl(path) {
  const baseUrl = getConfig().apiBaseUrl.replace(/\/$/, "");
  return `${baseUrl}${path}`;
}

function getToken() {
  return localStorage.getItem(getConfig().tokenStorageKey);
}

function getTokenType() {
  return localStorage.getItem(getConfig().tokenTypeStorageKey) || "Bearer";
}

function setSession(token, user, tokenType = "Bearer") {
  localStorage.setItem(getConfig().tokenStorageKey, token);
  localStorage.setItem(getConfig().tokenTypeStorageKey, tokenType);
  if (user) {
    localStorage.setItem(getConfig().userStorageKey, user);
  }
}

function clearSession() {
  localStorage.removeItem(getConfig().tokenStorageKey);
  localStorage.removeItem(getConfig().tokenTypeStorageKey);
  localStorage.removeItem(getConfig().userStorageKey);
}

function authHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = getToken();

  if (token) {
    headers.Authorization = `${getTokenType()} ${token}`;
  }

  return headers;
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "login.html";
  }
}