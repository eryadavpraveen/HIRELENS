import { configureStore, combineReducers } from '@reduxjs/toolkit'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storage from './storage'
import authReducer from '../features/auth/authSlice'
import interviewReducer from '../features/interview/interviewSlice'
import monitoringReducer from '../features/monitoring/monitoringSlice'
import reportReducer from '../features/report/reportSlice'

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'role', 'token', 'isAuthenticated'],
}

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  interview: interviewReducer,
  monitoring: monitoringReducer,
  report: reportReducer,
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)

export default store
