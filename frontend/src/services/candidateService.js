import api from './api'
import { mockCandidates } from '../utils/mockData'

import { IS_MOCK } from '../utils/env'

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const candidateService = {
  getAll: async () => {
    if (IS_MOCK) {
      await delay(300)
      return mockCandidates
    }
    const { data } = await api.get('/candidates/')
    return Array.isArray(data) ? data : []
  },
}

export default candidateService
