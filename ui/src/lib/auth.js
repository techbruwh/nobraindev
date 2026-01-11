import { invoke } from '@tauri-apps/api/core'
import { supabase } from './supabase'

/**
 * Authentication service for NoBrainDev using Supabase Auth
 * Handles Supabase authentication and secure token storage
 */

export class AuthService {
  constructor() {
    this.user = null
    this.session = null
  }

  /**
   * Initialize with Supabase user
   */
  setUser(user, session) {
    this.user = user
    this.session = session
    
    // Store user email for sync
    if (user?.email) {
      this.storeUserEmail(user.email)
    }
  }

  /**
   * Clear user
   */
  clearUser() {
    this.user = null
    this.session = null
    invoke('clear_user_tokens').catch(console.warn)
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.user
  }

  /**
   * Store user email for sync
   */
  async storeUserEmail(email) {
    try {
      await invoke('store_user_token', {
        key: 'user_email',
        token: email
      })
    } catch (error) {
      console.warn('Failed to store user email:', error)
    }
  }

  /**
   * Get stored user email
   */
  async getUserEmail() {
    try {
      return await invoke('get_user_token', { key: 'user_email' })
    } catch (error) {
      return this.user?.email || null
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const isDev = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: isDev ? window.location.origin : undefined,
        skipBrowserRedirect: !isDev, // true for prod, false for dev
      }
    })
    
    if (error) throw error
    return data
  }

  /**
   * Sign in with email OTP
   */
  async signInWithOTP(email) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    })
    
    if (error) throw error
    return data
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })
    
    if (error) throw error
    
    if (data.user && data.session) {
      this.setUser(data.user, data.session)
    }
    
    return data
  }

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    this.clearUser()
  }

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    
    if (session) {
      this.session = session
      this.user = session.user
    }
    
    return session
  }
}

// Export singleton instance
export const authService = new AuthService()
