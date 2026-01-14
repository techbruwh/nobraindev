import { User, ShieldCheck, RefreshCw, CheckCircle, AlertCircle, Shield, Chrome } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/lib/supabase-auth'
import { syncService } from '@/lib/sync'
import { isSupabaseConfigured } from '@/lib/supabase'

export function AccountPanel({ 
  hasUnsyncedChanges, 
  onSyncComplete, 
  onSyncStart,
  lastSyncTime: externalLastSyncTime 
}) {
  const { user, signInWithGoogle, signOut } = useSupabaseAuth()
  const isSignedIn = !!user
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [error, setError] = useState(null)
  const [localLastSyncTime, setLocalLastSyncTime] = useState(null)
  const [syncApproval, setSyncApproval] = useState(null)
  const [checkingApproval, setCheckingApproval] = useState(false)
  
  // Auth UI state
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  
  const lastSyncTime = externalLastSyncTime || localLastSyncTime

  // Check approval status when user signs in
  useEffect(() => {
    if (isSignedIn && user) {
      checkApprovalStatus()
    } else {
      setSyncApproval(null)
    }
  }, [isSignedIn, user])

  const checkApprovalStatus = async () => {
    const email = user?.email
    if (!email) return

    setCheckingApproval(true)
    try {
      const approval = await syncService.checkSyncApproval(email)
      setSyncApproval(approval)
    } catch (error) {
      console.error('Failed to check approval:', error)
    } finally {
      setCheckingApproval(false)
    }
  }

  const handleRequestAccess = async () => {
    const email = user?.email
    if (!email) return

    setError(null)
    try {
      await syncService.requestSyncApproval(email)
      await checkApprovalStatus()
      setSyncStatus({
        type: 'success',
        message: 'Access requested! You will be notified once approved.'
      })
    } catch (error) {
      setError('Failed to request access. Please try again.')
    }
  }

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true)
    setError(null)

    try {
      await signInWithGoogle()
      // Google OAuth will redirect, so we don't need to do anything here
    } catch (err) {
      console.error('Google sign in error:', err)
      setError(err.message || 'Failed to sign in with Google. Please try again.')
      setIsAuthenticating(false)
    }
  }

  const handleSync = async () => {
    const email = user?.email
    if (!email) {
      setError('User email not found')
      return
    }

    // If no unsynced changes, show message without calling API
    if (!hasUnsyncedChanges) {
      setSyncStatus({
        type: 'success',
        message: '✓ Everything is up to date'
      })
      return
    }

    setIsSyncing(true)
    setError(null)
    setSyncStatus(null)
    onSyncStart?.()

    try {
      const result = await syncService.syncAll(email)
      
      // Create user-friendly message
      let message
      if (result.pushed === 0 && result.pulled === 0) {
        message = '✓ Everything is up to date'
      } else if (result.pushed > 0 && result.pulled === 0) {
        message = `↑ Pushed ${result.pushed} snippet${result.pushed > 1 ? 's' : ''} to cloud`
      } else if (result.pushed === 0 && result.pulled > 0) {
        message = `↓ Pulled ${result.pulled} snippet${result.pulled > 1 ? 's' : ''} from cloud`
      } else {
        message = `↑ ${result.pushed} up, ↓ ${result.pulled} down`
      }
      
      setSyncStatus({
        type: 'success',
        message,
        ...result
      })
      setLocalLastSyncTime(result.syncTime)
      
      // Notify parent that sync completed successfully
      onSyncComplete?.(result.syncTime)
    } catch (error) {
      console.error('Sync failed:', error)
      
      if (error.message === 'SYNC_NOT_APPROVED') {
        setError('Sync access not approved yet. Please wait for approval.')
      } else {
        setSyncStatus({
          type: 'error',
          message: error.message || 'Sync failed'
        })
      }
    } finally {
      setIsSyncing(false)
    }
  }
  
  // Listen for footer sync clicks
  useEffect(() => {
    const handleFooterSync = () => {
      if (isSignedIn && syncApproval?.approved) {
        handleSync()
      }
    }
    
    window.addEventListener('footer-sync-clicked', handleFooterSync)
    return () => window.removeEventListener('footer-sync-clicked', handleFooterSync)
  }, [isSignedIn, syncApproval, hasUnsyncedChanges, user])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Error Message */}
        {error && (
          <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-[10px] text-destructive">{error}</p>
          </div>
        )}

        {/* Sync Status */}
        {syncStatus && (
          <div className={`mb-3 p-2 rounded-md border ${
            syncStatus.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-destructive/10 border-destructive/20'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatus.type === 'success' ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
              <p className={`text-[10px] ${
                syncStatus.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}>
                {syncStatus.message}
              </p>
            </div>
          </div>
        )}

        {!isSignedIn ? (
          // Login View
          <div className="space-y-3">
            <div className="text-center py-4">
              <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h2 className="text-sm font-semibold mb-1">Sign in to sync</h2>
              <p className="text-[10px] text-muted-foreground mb-4">
                Access your snippets from anywhere
              </p>
            </div>

            {/* Security Features */}
            <div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h3 className="text-[11px] font-semibold text-blue-600">Secure Cloud Storage</h3>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-[9px] text-foreground/80">
                    <span className="font-medium">Row-Level Security:</span> Only you can access your data via JWT authentication, even database admins cannot read it
                  </p>
                </div>
                
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-[9px] text-foreground/80">
                    <span className="font-medium">Encryption at Rest:</span> Data encrypted with user-specific keys
                  </p>
                </div>
                
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-[9px] text-foreground/80">
                    <span className="font-medium">Encryption in Transit:</span> HTTPS/TLS for all data transmission
                  </p>
                </div>
              </div>
            </div>

            {!isSupabaseConfigured() && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-md mb-3">
                <p className="text-[10px] text-amber-600">
                  Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env
                </p>
              </div>
            )}

            {isSupabaseConfigured() ? (
              <div className="space-y-2">
                {/* Google Sign In Button - Improved UI */}
                <Button 
                  type="button"
                  className="w-full h-9 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm transition-all hover:shadow-md"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                      <span className="text-xs font-medium">Signing in...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="text-xs font-medium">Continue with Google</span>
                    </>
                  )}
                </Button>

                <p className="text-[9px] text-center text-muted-foreground px-2">
                  Sign in with your Google account to sync your snippets across devices
                </p>
              </div>
            ) : (
              <Button 
                className="w-full"
                variant="default"
                disabled
              >
                Sign In
              </Button>
            )}

            
          </div>
        ) : (
          // Logged In View
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-accent rounded-md border">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Sync Controls */}
            <div className="space-y-2">
              {checkingApproval ? (
                <div className="p-3 text-center">
                  <RefreshCw className="h-4 w-4 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground mt-2">Checking access...</p>
                </div>
              ) : !syncApproval ? (
                // No approval record - show request button
                <div className="space-y-2">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <p className="text-[10px] text-amber-600">
                      Sync feature requires approval
                    </p>
                  </div>
                  <Button 
                    variant="default" 
                    className="w-full" 
                    size="sm"
                    onClick={handleRequestAccess}
                  >
                    Request Access
                  </Button>
                </div>
              ) : !syncApproval.approved ? (
                // Approval pending
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-[10px] text-blue-600 text-center">
                    ⏳ Access requested. Waiting for approval...
                  </p>
                  <p className="text-[9px] text-muted-foreground text-center mt-1">
                    Requested: {new Date(syncApproval.requested_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                // Approved - show sync button
                <>
                  {/* Encryption Status Badge */}
                  {syncApproval.encryption_enabled && (
                    <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-green-600">
                            Secure Cloud Encryption Enabled
                          </p>
                          <p className="text-[9px] text-green-600/80">
                            Your data are securely encrypted in the cloud
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-3 border-t">
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
