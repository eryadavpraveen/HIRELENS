/** Production builds use the real API unless USE_MOCK=true is set explicitly. */
export const IS_MOCK = import.meta.env.USE_MOCK === 'true'
