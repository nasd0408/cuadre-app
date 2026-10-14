/** Convierte respuestas heterogéneas de Axios/ASP.NET en texto seguro para UI. */
export function mensajeDeError(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;

  if (typeof data === "string" && data.trim()) return data.trim();

  if (data && typeof data === "object") {
    for (const key of ["message", "error", "title"]) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }

    if (data.errors && typeof data.errors === "object") {
      const first = Object.values(data.errors)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .find((value) => typeof value === "string" && value.trim());
      if (typeof first === "string") return first;
    }
  }

  const message = (error as any)?.message;
  if (
    typeof message === "string" &&
    message.trim() &&
    !message.includes("status code")
  )
    return message.trim();

  return fallback;
}
