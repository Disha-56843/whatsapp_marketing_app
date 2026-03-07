import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

// Common disposable/fake email domains to block
const BLOCKED_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "guerrillamail.info", "spam4.me", "trashmail.com", "dispostable.com",
  "fakeinbox.com", "mailnull.com", "spamgourmet.com", "trashmail.me",
  "discard.email", "spamfree24.org", "maildrop.cc", "tempr.email",
  "getnada.com", "filzmail.com", "getairmail.com", "spamoverlord.com",
];

// Check if email domain has valid MX records (can actually receive email)
export const validateEmailDomain = async (email) => {
  try {
    const domain = email.split("@")[1]?.toLowerCase();

    if (!domain) {
      return { valid: false, reason: "Invalid email format" };
    }

    // Block known disposable domains
    if (BLOCKED_DOMAINS.includes(domain)) {
      return { valid: false, reason: "Disposable email addresses are not allowed" };
    }

    // Check MX records — if domain has MX records it can receive emails
    const mxRecords = await resolveMx(domain);

    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, reason: "Email domain does not exist or cannot receive emails" };
    }

    return { valid: true };
  } catch (error) {
    // DNS lookup failed = domain doesn't exist
    return { valid: false, reason: "Email domain does not exist" };
  }
};