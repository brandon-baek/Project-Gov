const sensitivePatterns = [
  { label: "Social Security number", expression: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/ },
  { label: "payment card number", expression: /\b(?:\d[ -]*?){13,19}\b/ },
  { label: "bank account number", expression: /\b(?:account|routing)\s*(?:number|#|no\.?)*\s*[:=-]?\s*\d{6,17}\b/i },
  { label: "government document number", expression: /\b(?:passport|license|alien|uscis)\s*(?:number|#|no\.?)*\s*[:=-]?\s*[a-z0-9-]{6,18}\b/i }
];

export function findSensitiveData(value: string) {
  return sensitivePatterns.filter((pattern) => pattern.expression.test(value)).map((pattern) => pattern.label);
}

export function isLikelyEmergency(value: string) {
  return /\b(immediate danger|life[- ]threatening|call 911|emergency right now)\b/i.test(value);
}
