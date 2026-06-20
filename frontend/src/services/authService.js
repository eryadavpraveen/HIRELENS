import api from './api'

export const authService = {
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    return data
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData)
    return data
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me')
    return data
  },

  refresh: async (refreshToken) => {
    const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken })
    return data
  },

  logout: async (refreshToken) => {
    const { data } = await api.post('/auth/logout', { refresh_token: refreshToken })
    return data
  },

  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  },

  resetPassword: async (token, password) => {
    const { data } = await api.post('/auth/reset-password', { token, password })
    return data
  },
}

export default authService
