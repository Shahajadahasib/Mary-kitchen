const SESSION_ID_KEY = "mary_kitchen_session_id";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateSessionId() {
  const existingSessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (existingSessionId) return existingSessionId;

  const sessionId = createSessionId();
  sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}
