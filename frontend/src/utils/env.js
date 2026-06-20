/** Production builds use the real API unless VITE_USE_MOCK=true is set explicitly. */
export const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
