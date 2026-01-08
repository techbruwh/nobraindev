import { invoke } from '@tauri-apps/api/core'

/**
 * Authentication service for NoBrainDev using Clerk
 * Handles Clerk authentication and secure token storage
 */

export class AuthService {
  constructor() {
    this.user = null
    this.clerkUser = null
  }

  /**
   * Initialize with Clerk user
   */
  setUser(clerkUser) {
    this.clerkUser = clerkUser
    this.user = clerkUser
    
    // Store user email for sync
    if (clerkUser?.primaryEmailAddress?.emailAddress) {
      this.storeUserEmail(clerkUser.primaryEmailAddress.emailAddress)
    }
  }

  /**
   * Clear user
   */
  clearUser() {
    this.clerkUser = null
    this.user = null
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
      return this.user?.primaryEmailAddress?.emailAddress || null
    }
  }
}

// Export singleton instance
export const authService = new AuthService()
