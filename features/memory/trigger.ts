const preferenceLanguage = /(?:喜欢|偏好|更喜欢|比较喜欢|感兴趣|不喜欢|讨厌|避免|不想|不希望)/i;
const travelHabitLanguage = /(?:习惯|通常|一般旅行|平时)/i;
const transportPreference = /(?:自驾|跟团|自由行|公共交通)/i;
const pacePreference = /(?:慢一点|轻松|不要赶|不要太累|节奏慢)/i;

/** Returns whether a message is worth sending to the explicit-preference extractor. */
export function shouldExtractMemory(message: string): boolean {
  if (typeof message !== "string") return false;
  const normalized = message.trim();
  if (!normalized) return false;
  return preferenceLanguage.test(normalized)
    || travelHabitLanguage.test(normalized)
    || ((transportPreference.test(normalized) || pacePreference.test(normalized)) && /(我|自己|个人|习惯|通常|平时|偏好|喜欢|不喜欢)/i.test(normalized));
}
