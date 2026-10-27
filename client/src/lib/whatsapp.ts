/**
 * Número de WhatsApp da Joseph. Vem de VITE_WHATSAPP_NUMBER (como o site já
 * fazia); o valor de reserva é o mesmo do site publicado hoje
 * (rodapé: (89) 99976-1436).
 */
const NUMERO_RESERVA = "5589999761436";

export function numeroWhatsApp(): string {
  const env = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "";
  return (env || NUMERO_RESERVA).replace(/\D/g, "");
}

export function linkWhatsApp(mensagem: string): string {
  return `https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(mensagem)}`;
}
