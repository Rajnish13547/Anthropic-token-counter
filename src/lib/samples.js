// Predefined text samples shown in the UI. Mix of single words, sentences,
// code, non-English text and emoji to show how tokenisation differs.
export const SAMPLES = [
  { id: 'word', label: 'Single word', text: 'Hello' },
  { id: 'long-word', label: 'Long word', text: 'Antidisestablishmentarianism' },
  { id: 'sentence', label: 'Short sentence', text: 'The quick brown fox jumps over the lazy dog.' },
  {
    id: 'paragraph',
    label: 'Paragraph',
    text: 'Large language models read text as tokens, which are chunks of characters rather than whole words. Common words are often a single token, while rare words are split into several pieces.',
  },
  { id: 'code', label: 'Code snippet', text: 'function add(a, b) {\n  return a + b;\n}\nconst total = add(2, 3);' },
  { id: 'numbers', label: 'Numbers', text: '3.14159265358979323846' },
  { id: 'japanese', label: 'Japanese', text: '吾輩は猫である。名前はまだ無い。' },
  { id: 'emoji', label: 'Emoji', text: '🚀🔥😀 Let’s ship it! 🎉' },
]
