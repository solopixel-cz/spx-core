const currencyFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("cs-CZ");

const dateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDate(dateOrStr: Date | string | null | undefined): string {
  if (!dateOrStr) return "—";
  const date = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  return dateFormatter.format(date);
}

const dateTimeFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(dateOrStr: Date | string | null | undefined): string {
  if (!dateOrStr) return "—";
  const date = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  return dateTimeFormatter.format(date);
}
