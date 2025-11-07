/**
 * Helper functions for WhatsApp integration
 */

interface OrderItem {
  menuItem?: {
    name: string;
    nameAr?: string | null;
  } | null;
  customItemName?: string | null;
  customItemNameAr?: string | null;
  quantity: number;
  notes?: string | null;
  extras?: any;
}

interface Order {
  id: string;
  tableNumber?: string | null;
  orderType: string;
  items: OrderItem[];
}

/**
 * Generate WhatsApp message for kitchen from order
 * @param order - Order object
 * @param isRTL - Is right-to-left language
 * @returns Formatted WhatsApp message
 */
export function generateKitchenWhatsAppMessage(
  order: Order,
  isRTL: boolean = false
): string {
  const lines: string[] = [];

  // Header
  if (isRTL) {
    lines.push("🔔 *طلب جديد من المطعم*");
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    if (order.tableNumber) {
      lines.push(`📍 *الطاولة:* ${order.tableNumber}`);
    } else {
      lines.push(
        `📦 *نوع الطلب:* ${order.orderType === "DELIVERY" ? "توصيل" : "داخلي"}`
      );
    }
    lines.push(`🆔 *رقم الطلب:* #${order.id.slice(-8)}`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("");
    lines.push("📋 *تفاصيل الطلب:*");
    lines.push("");
  } else {
    lines.push("🔔 *New Order from Restaurant*");
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    if (order.tableNumber) {
      lines.push(`📍 *Table:* ${order.tableNumber}`);
    } else {
      lines.push(
        `📦 *Order Type:* ${
          order.orderType === "DELIVERY" ? "Delivery" : "Dine-in"
        }`
      );
    }
    lines.push(`🆔 *Order ID:* #${order.id.slice(-8)}`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("");
    lines.push("📋 *Order Details:*");
    lines.push("");
  }

  // Items
  order.items.forEach((item, index) => {
    const itemName = isRTL
      ? item.menuItem?.nameAr ||
        item.customItemNameAr ||
        item.menuItem?.name ||
        item.customItemName ||
        "Unknown"
      : item.menuItem?.name || item.customItemName || "Unknown";

    lines.push(`${index + 1}. *${itemName}* × ${item.quantity}`);

    // Extras
    if (item.extras && typeof item.extras === "object") {
      const extrasNames: string[] = [];

      // Parse extras based on structure
      if (item.extras.extras && item.extras.extras.options) {
        item.extras.extras.options.forEach((opt: any) => {
          extrasNames.push(isRTL ? opt.nameAr || opt.name : opt.name);
        });
      } else {
        // Handle array format
        Object.values(item.extras).forEach((extraGroup: any) => {
          if (Array.isArray(extraGroup)) {
            extraGroup.forEach((extraId: string) => {
              extrasNames.push(extraId);
            });
          }
        });
      }

      if (extrasNames.length > 0) {
        lines.push(
          `   ➕ ${isRTL ? "الإضافات:" : "Extras:"} ${extrasNames.join(", ")}`
        );
      }
    }

    // Notes
    if (item.notes) {
      lines.push(`   📝 ${isRTL ? "ملاحظات:" : "Notes:"} ${item.notes}`);
    }

    lines.push("");
  });

  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push(
    isRTL
      ? "⏰ يرجى تحضير الطلب بأسرع وقت ممكن"
      : "⏰ Please prepare as soon as possible"
  );

  return lines.join("\n");
}

/**
 * Generate WhatsApp URL for sending message
 * @param phoneOrLink - Phone number or WhatsApp group link
 * @param message - Message to send
 * @returns WhatsApp URL
 */
export function generateWhatsAppURL(
  phoneOrLink: string,
  message: string
): string {
  const encodedMessage = encodeURIComponent(message);

  // Check if it's a group link
  if (phoneOrLink.includes("chat.whatsapp.com")) {
    return `${phoneOrLink}?text=${encodedMessage}`;
  }

  // It's a phone number
  // Remove any non-digit characters except +
  const cleanPhone = phoneOrLink.replace(/[^\d+]/g, "");

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Validate WhatsApp number or link
 * @param input - Phone number or group link
 * @returns Boolean indicating if valid
 */
export function isValidWhatsAppInput(input: string): boolean {
  if (!input || input.trim() === "") return true; // Optional field

  // Check if it's a WhatsApp group link
  if (input.includes("chat.whatsapp.com")) {
    return /^https?:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+$/.test(input);
  }

  // Check if it's a phone number (with or without +)
  return /^[\+]?[1-9][\d]{7,15}$/.test(input.replace(/[\s\-()]/g, ""));
}
