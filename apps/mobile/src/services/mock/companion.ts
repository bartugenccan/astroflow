import {
  ChatReply,
  CheckInResult,
  GuidanceAnswer,
  GuidanceTopic,
  IntentionSuggestion,
} from "../types";
import { Locale } from "../../i18n";

/** Deterministic offline stand-ins for the companion + intentions AI. */

const GUIDANCE: Record<GuidanceTopic, Record<Locale, { takeaway: string; why: string; actions: string[] }>> = {
  love: {
    en: { takeaway: "Lead with warmth today — a small gesture lands well.", why: "The day softens your connections and makes sincerity easy to receive.", actions: ["Reach out to someone you care about.", "Say the kind thing you'd usually hold back."] },
    tr: { takeaway: "Bugün sıcaklıkla yaklaş — küçük bir jest iyi karşılık bulur.", why: "Gün bağlarını yumuşatıyor, içtenliğin kolayca karşılık buluyor.", actions: ["Değer verdiğin birine ulaş.", "Normalde tuttuğun güzel sözü söyle."] },
  },
  work: {
    en: { takeaway: "Pick one priority and protect your focus.", why: "Steady single-tracked effort beats juggling right now.", actions: ["Choose the one task that matters most.", "Silence a distraction for an hour."] },
    tr: { takeaway: "Tek bir önceliği seç ve odağını koru.", why: "Şu an istikrarlı, tek yönlü çaba dağınıklığı yener.", actions: ["En önemli tek işi seç.", "Bir saatliğine dikkat dağıtıcıyı sustur."] },
  },
  money: {
    en: { takeaway: "A good day to review, not to splurge.", why: "Clarity favours value-led choices over impulse.", actions: ["Glance at your budget.", "Delay one non-urgent purchase."] },
    tr: { takeaway: "Harcamak değil, gözden geçirmek için iyi bir gün.", why: "Netlik, dürtüsel değil değer odaklı seçimleri destekliyor.", actions: ["Bütçene göz at.", "Acil olmayan bir alışverişi ertele."] },
  },
  decision: {
    en: { takeaway: "Sleep on the big call — clarity is close, not here yet.", why: "The picture is still settling; a day changes little but adds certainty.", actions: ["Write the pros and cons down.", "Name the one thing you're afraid of."] },
    tr: { takeaway: "Büyük karara bir gece daha ver — netlik yakın ama henüz değil.", why: "Tablo hâlâ oturuyor; bir gün az şey değiştirir ama kesinlik katar.", actions: ["Artıları ve eksileri yaz.", "Korktuğun tek şeyi adlandır."] },
  },
  person: {
    en: { takeaway: "Be direct and kind — they can hear you today.", why: "Conversations land more openly than usual.", actions: ["Say what you actually mean.", "Ask one honest question."] },
    tr: { takeaway: "Doğrudan ve nazik ol — bugün seni duyabilirler.", why: "Konuşmalar her zamankinden daha açık karşılanıyor.", actions: ["Gerçekten kastettiğini söyle.", "Dürüst bir soru sor."] },
  },
  mood: {
    en: { takeaway: "Lower the bar and be gentle with yourself today.", why: "Your energy asks for rest more than push.", actions: ["Do less, breathe slower.", "Protect one hour just for you."] },
    tr: { takeaway: "Çıtayı düşür ve bugün kendine nazik ol.", why: "Enerjin zorlamaktan çok dinlenmek istiyor.", actions: ["Daha az yap, daha yavaş nefes al.", "Bir saati sadece kendine ayır."] },
  },
  general: {
    en: { takeaway: "A steady day — move deliberately and you'll feel good.", why: "Nothing pushes hard now, so small intentional steps go far.", actions: ["Do one thing you've been putting off.", "Give yourself a real break."] },
    tr: { takeaway: "Dengeli bir gün — kararlı hareket et, iyi hissedeceksin.", why: "Şu an zorlayan yok; küçük, bilinçli adımlar ileri götürür.", actions: ["Ertelediğin bir şeyi yap.", "Kendine gerçek bir mola ver."] },
  },
};

export function mockGuidance(topic: GuidanceTopic, locale: Locale): GuidanceAnswer {
  const c = (GUIDANCE[topic] ?? GUIDANCE.general)[locale];
  return { topic, takeaway: c.takeaway, why: c.why, actions: c.actions };
}

export function mockChatReply(message: string, locale: Locale): ChatReply {
  return locale === "tr"
    ? {
        reply: `Seni duyuyorum. "${message.slice(0, 60)}" — bununla ilgili biraz daha anlat, birlikte bakalım.`,
        takeaway: "Buradayım, acele etmene gerek yok.",
      }
    : {
        reply: `I hear you. "${message.slice(0, 60)}" — tell me a little more and we'll look at it together.`,
        takeaway: "I'm here, no rush.",
      };
}

export function mockAffirmation(goalText: string, locale: Locale): string {
  return locale === "tr"
    ? `Her gün "${goalText}" hedefime doğru küçük, kararlı bir adım atıyorum.`
    : `Each day I take one small, steady step toward "${goalText}".`;
}

export function mockIntentionSuggestions(locale: Locale): IntentionSuggestion[] {
  return locale === "tr"
    ? [
        { goal: "Her gün 10 dakika kendime ayırmak", why: "Şu an sakinliğe alan açmak sana iyi gelir.", lifeArea: "energy" },
        { goal: "Bir işi sonuna kadar bitirmek", why: "İstikrarlı çaba bu dönemde ödüllendiriliyor.", lifeArea: "career" },
        { goal: "Sevdiğim birine ulaşmak", why: "Bir bağı derinleştirmek için uygun bir zaman.", lifeArea: "love" },
      ]
    : [
        { goal: "Take 10 quiet minutes for myself daily", why: "Making room for calm serves you right now.", lifeArea: "energy" },
        { goal: "Finish one thing I keep putting off", why: "Steady effort is rewarded this stretch.", lifeArea: "career" },
        { goal: "Reach out to someone I care about", why: "It's a good time to deepen a connection.", lifeArea: "love" },
      ];
}

export function mockCheckInReply(
  conviction: number,
  userText: string | undefined,
  locale: Locale,
): { response: string; conviction: number; followUp: string; strongerPhrasing?: string } {
  return locale === "tr"
    ? {
        response: "Bugün göründüğün için teşekkürler — devam etmek, mükemmel olmaktan önemli.",
        conviction,
        followUp: "Bunu bugün gerçek kılan tek küçük şey ne olabilir?",
      }
    : {
        response: "Thanks for showing up today — consistency matters more than being perfect.",
        conviction,
        followUp: "What one small thing could make this real today?",
      };
}
