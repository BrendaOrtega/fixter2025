// ID persistente por navegador para deduplicar visitantes anónimos entre sesiones
export function getVisitorId(): string {
  try {
    const KEY = "fx_visitor_id";
    let id = localStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
