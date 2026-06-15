/**
 * Shared email status enum and ordering — used by outreachEmails and deliveryEmails.
 */

export const emailStatusValues = [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
] as const;

export type EmailStatus = (typeof emailStatusValues)[number];

// Status progression order (higher index = higher status, only upgrade)
export const statusOrder: Record<string, number> = {
  sent: 0,
  delivered: 1,
  opened: 2,
  clicked: 3,
  bounced: 4,
  complained: 5,
};
