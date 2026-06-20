import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

let refreshPromise = null

function clearAuthStorage() {
  localStorage.removeItem('hirelens_token')
  localStorage.removeItem('hirelens_refresh_token')
  localStorage.removeItem('hirelens_user')
}

function redirectToLogin() {
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login'
  }
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('hirelens_refresh_token')
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  })

  localStorage.setItem('hirelens_token', data.access_token)
  localStorage.setItem('hirelens_refresh_token', data.refresh_token)
  return data.access_token
}

/** Return a non-expired access token, refreshing proactively when needed. */
export async function getValidAccessToken() {
  const token = localStorage.getItem('hirelens_token')
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const expMs = payload.exp * 1000
    if (Date.now() >= expMs - 60_000) {
      return await refreshAccessToken()
    }
  } catch {
    /* malformed token — try refresh */
    try {
      return await refreshAccessToken()
    } catch {
      return token
    }
  }

  return token
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hirelens_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/register')

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRoute) {
      originalRequest._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }
        const newToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        clearAuthStorage()
        redirectToLogin()
      }
    }

    if (error.response?.status === 401 && !isAuthRoute) {
      clearAuthStorage()
      redirectToLogin()
    }

    return Promise.reject(error)
  }
)

export default api
