import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import authService from '../../services/authService'

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const tokens = await authService.login(credentials)
      localStorage.setItem('hirelens_token', tokens.access_token)
      localStorage.setItem('hirelens_refresh_token', tokens.refresh_token)

      const user = await authService.getMe()
      localStorage.setItem('hirelens_user', JSON.stringify(user))

      return {
        token: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user,
        role: user.role,
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Login failed')
    }
  }
)

export const hydrateSession = createAsyncThunk(
  'auth/hydrate',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('hirelens_token')
    if (!token) {
      return rejectWithValue('No session')
    }

    try {
      const user = await authService.getMe()
      localStorage.setItem('hirelens_user', JSON.stringify(user))
      return {
        token,
        refreshToken: localStorage.getItem('hirelens_refresh_token'),
        user,
        role: user.role,
      }
    } catch (error) {
      localStorage.removeItem('hirelens_token')
      localStorage.removeItem('hirelens_refresh_token')
      localStorage.removeItem('hirelens_user')
      return rejectWithValue(error.response?.data?.detail || 'Session expired')
    }
  }
)

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  const refreshToken = localStorage.getItem('hirelens_refresh_token')
  if (refreshToken) {
    try {
      await authService.logout(refreshToken)
    } catch {
      /* ignore */
    }
  }
  localStorage.removeItem('hirelens_token')
  localStorage.removeItem('hirelens_refresh_token')
  localStorage.removeItem('hirelens_user')
})

const initialState = {
  user: null,
  role: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  hydrating: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.role = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.error = null
      localStorage.removeItem('hirelens_token')
      localStorage.removeItem('hirelens_refresh_token')
      localStorage.removeItem('hirelens_user')
    },
    setCredentials: (state, action) => {
      const { user, token, role, refreshToken } = action.payload
      state.user = user
      state.token = token
      state.refreshToken = refreshToken ?? state.refreshToken
      state.role = role
      state.isAuthenticated = true
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.role = action.payload.role
        state.isAuthenticated = true
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(hydrateSession.pending, (state) => {
        state.hydrating = true
      })
      .addCase(hydrateSession.fulfilled, (state, action) => {
        state.hydrating = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.role = action.payload.role
        state.isAuthenticated = true
      })
      .addCase(hydrateSession.rejected, (state) => {
        state.hydrating = false
        state.isAuthenticated = false
        state.user = null
        state.role = null
        state.token = null
        state.refreshToken = null
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.role = null
        state.token = null
        state.refreshToken = null
        state.isAuthenticated = false
      })
  },
})

export const { logout, setCredentials, clearError } = authSlice.actions
export default authSlice.reducer
