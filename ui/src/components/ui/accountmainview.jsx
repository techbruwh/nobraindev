import { User, ShieldCheck, RefreshCw, CheckCircle, AlertCircle, Shield, Chrome, Sparkles, Lock, Cloud, Info, Keyboard, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/lib/supabase-auth'
import { syncService } from '@/lib/sync'
import { isSupabaseConfigured } from '@/lib/supabase'

export function AccountMainView({
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
      setTimeout(() => setSyncStatus(null), 3000)
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

      // Clear success message after 3 seconds
      setTimeout(() => setSyncStatus(null), 3000)
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

      // Clear error message after 5 seconds
      setTimeout(() => setSyncStatus(null), 5000)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - User Info & Actions */}
      <div className="w-[400px] border-r flex flex-col bg-background">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
              <User className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Account & Sync</h2>
            <p className="text-xs text-muted-foreground">
              Manage your account settings
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Sync Status */}
        {syncStatus && (
          <div className={`mx-4 mt-4 p-3 rounded-lg border ${
            syncStatus.type === 'success'
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-destructive/10 border-destructive/20'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatus.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <p className={`text-xs ${
                syncStatus.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}>
                {syncStatus.message}
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!isSignedIn ? (
            // Login View
            <div className="space-y-4">
              {/* Security Info - Compact */}
              <div className="p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-semibold text-blue-600">Secure Cloud Storage</h3>
                </div>
                <p className="text-[10px] text-foreground/70">
                  Your data is encrypted with row-level security, encryption at rest, and TLS in transit.
                </p>
              </div>

              {!isSupabaseConfigured() && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-[10px] text-amber-600">
                    Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env
                  </p>
                </div>
              )}

              {isSupabaseConfigured() && (
                <Button
                  type="button"
                  className="w-full h-10 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      <span className="text-xs font-medium">Signing in...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="text-xs font-medium">Continue with Google</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            // Logged In View
            <div className="space-y-4">
              {/* User Profile Card */}
              <div className="p-4 bg-accent rounded-lg border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={signOut}
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Sign Out
                </Button>
              </div>

              {/* Sync Controls */}
              <div className="space-y-3">
                {checkingApproval ? (
                  <div className="p-4 text-center bg-muted rounded-lg">
                    <RefreshCw className="h-5 w-5 mx-auto animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2">Checking access...</p>
                  </div>
                ) : !syncApproval ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-600">
                        Sync feature requires approval
                      </p>
                    </div>
                    <Button
                      variant="default"
                      className="w-full text-xs"
                      onClick={handleRequestAccess}
                    >
                      Request Access
                    </Button>
                  </div>
                ) : !syncApproval.approved ? (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-blue-600">Access requested</p>
                        <p className="text-[10px] text-blue-600/80 mt-1">
                          {new Date(syncApproval.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {syncApproval.encryption_enabled && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <p className="text-xs font-semibold text-green-600">
                            Secure Encryption Enabled
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant={hasUnsyncedChanges ? "default" : "outline"}
                      className="w-full text-xs"
                      onClick={handleSync}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Syncing...
                        </>
                      ) : hasUnsyncedChanges ? (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Sync Now
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Up to Date
                        </>
                      )}
                    </Button>

                    {hasUnsyncedChanges && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        You have unsynced changes
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Features */}
      <div className="flex-1 flex flex-col bg-muted/30">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-card border rounded-lg">
                <Cloud className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="text-sm font-semibold mb-2">Cloud Sync</h3>
                <p className="text-xs text-muted-foreground">
                  Access snippets from any device
                </p>
              </div>

              <div className="p-5 bg-card border rounded-lg">
                <Lock className="h-8 w-8 text-green-500 mb-3" />
                <h3 className="text-sm font-semibold mb-2">Encrypted</h3>
                <p className="text-xs text-muted-foreground">
                  End-to-end encryption keeps data safe
                </p>
              </div>

              <div className="p-5 bg-card border rounded-lg">
                <Sparkles className="h-8 w-8 text-purple-500 mb-3" />
                <h3 className="text-sm font-semibold mb-2">Auto Sync</h3>
                <p className="text-xs text-muted-foreground">
                  Changes backed up automatically
                </p>
              </div>

              <div className="p-5 bg-card border rounded-lg">
                <ShieldCheck className="h-8 w-8 text-amber-500 mb-3" />
                <h3 className="text-sm font-semibold mb-2">Row-Level Security</h3>
                <p className="text-xs text-muted-foreground">
                  Only you can access your data
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
