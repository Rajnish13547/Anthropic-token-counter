// Shared by the UI (counter, disabled button) and the server (validation).
export const MAX_CUSTOM_CHARS = 5000

// Count characters the way a person would (emoji = 1), not UTF-16 code units.
export const charCount = (text) => [...text].length
