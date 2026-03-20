const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";

function cleanEnv(value) {
  if (value === undefined || value === null) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getPhoneNumberId() {
  return (
    cleanEnv(process.env.WHATSAPP_PHONE_NUMBER_ID) ||
    cleanEnv(process.env.WHATSAPP_PHONE_ID) ||
    cleanEnv(process.env.PHONE_NUMBER_ID)
  );
}

function getAccessToken() {
  return (
    cleanEnv(process.env.WHATSAPP_CLOUD_API_TOKEN) ||
    cleanEnv(process.env.WHATSAPP_TOKEN) ||
    cleanEnv(process.env.WHATSAPP_ACCESS_TOKEN) ||
    cleanEnv(process.env.META_WHATSAPP_TOKEN)
  );
}

function normalizePhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  const defaultCountryCode = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "";
  if (defaultCountryCode && digits.length === 10) {
    digits = `${defaultCountryCode}${digits}`;
  }
  return digits;
}

function guessFileName(mediaUrl) {
  try {
    const pathname = new URL(mediaUrl).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "attachment");
  } catch {
    return "attachment";
  }
}

function buildPayload({ to, text, mediaUrl, mediaType }) {
  const normalizedTo = normalizePhone(to);
  if (!normalizedTo) {
    throw new Error("Invalid WhatsApp phone number");
  }

  if (!mediaUrl || !mediaType) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedTo,
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    };
  }

  if (mediaType === "image") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedTo,
      type: "image",
      image: {
        link: mediaUrl,
        ...(text ? { caption: text } : {}),
      },
    };
  }

  if (mediaType === "video") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedTo,
      type: "video",
      video: {
        link: mediaUrl,
        ...(text ? { caption: text } : {}),
      },
    };
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedTo,
    type: "document",
    document: {
      link: mediaUrl,
      filename: guessFileName(mediaUrl),
      ...(text ? { caption: text } : {}),
    },
  };
}

export function validateWhatsAppConfig() {
  return Boolean(getPhoneNumberId() && getAccessToken());
}

export function getWhatsAppConfigStatus() {
  const phoneNumberId = getPhoneNumberId();
  const accessToken = getAccessToken();
  return {
    valid: Boolean(phoneNumberId && accessToken),
    hasPhoneNumberId: Boolean(phoneNumberId),
    hasAccessToken: Boolean(accessToken),
    phoneNumberIdLength: phoneNumberId ? String(phoneNumberId).length : 0,
    accessTokenLength: accessToken ? String(accessToken).length : 0,
    graphApiVersion: GRAPH_API_VERSION,
  };
}

export async function sendWhatsAppMessage({ to, text, mediaUrl, mediaType }) {
  const phoneNumberId = getPhoneNumberId();
  const accessToken = getAccessToken();

  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp Cloud API is not configured on the server");
  }

  const payload = buildPayload({ to, text, mediaUrl, mediaType });
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const errorMessage =
      data?.error?.error_user_msg ||
      data?.error?.message ||
      "WhatsApp Cloud API request failed";
    throw new Error(errorMessage);
  }

  return data;
}
