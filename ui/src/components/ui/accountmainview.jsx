import { User, ShieldCheck, RefreshCw, CheckCircle, AlertCircle, Shield, Chrome, Sparkles, Lock, Cloud, Info, LogOut, Monitor, ClipboardCopy, Code, Zap, Plus } from 'lucide-react'
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
  const [isMac, setIsMac] = useState(false)

  // Auth UI state
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const lastSyncTime = externalLastSyncTime || localLastSyncTime

  // Detect OS
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

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
      onSyncComplete?.(result.syncTime)
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
      setTimeout(() => setSyncStatus(null), 5000)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - Quick Actions */}
      <div className="w-[360px] border-r flex flex-col bg-background">
        {/* Header */}
        <div className="p-5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Account</h2>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Quick account actions
          </p>
        </div>

        {/* Error/Status Messages */}
        <div className="p-4 space-y-2">
          {error && (
            <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <p className="text-[10px] text-destructive">{error}</p>
              </div>
            </div>
          )}

          {syncStatus && (
            <div className={`p-2.5 rounded-lg border ${
              syncStatus.type === 'success'
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-destructive/10 border-destructive/20'
            }`}>
              <div className="flex items-center gap-2">
                {syncStatus.type === 'success' ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                )}
                <p className={`text-[10px] ${
                  syncStatus.type === 'success' ? 'text-green-600' : 'text-destructive'
                }`}>
                  {syncStatus.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!isSignedIn ? (
            // Login View
            <div className="space-y-3">
              <div className="text-center py-2">
                <User className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                <h3 className="text-sm font-semibold mb-1">Sign In Required</h3>
                <p className="text-[10px] text-muted-foreground">
                  Sign in to access cloud sync features
                </p>
              </div>

              {isSupabaseConfigured() ? (
                <Button
                  type="button"
                  className="w-full h-9 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
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
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="text-xs font-medium">Continue with Google</span>
                    </>
                  )}
                </Button>
              ) : (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-[10px] text-amber-600">
                    Supabase not configured
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Logged In View
            <div className="space-y-3">
              {/* User Profile Card */}
              <div className="p-3 bg-accent rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
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
              </div>

              {/* Sync Controls */}
              <div className="space-y-2">
                {checkingApproval ? (
                  <div className="p-3 text-center bg-muted rounded-lg">
                    <RefreshCw className="h-4 w-4 mx-auto animate-spin text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground mt-2">Checking...</p>
                  </div>
                ) : !syncApproval ? (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-[10px] text-amber-600">
                        Sync requires approval
                      </p>
                    </div>
                    <Button
                      variant="default"
                      className="w-full text-xs"
                      size="sm"
                      onClick={handleRequestAccess}
                    >
                      Request Access
                    </Button>
                  </div>
                ) : !syncApproval.approved ? (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-medium text-blue-600">Pending</p>
                        <p className="text-[9px] text-blue-600/80 mt-1">
                          {new Date(syncApproval.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant={hasUnsyncedChanges ? "default" : "outline"}
                      className="w-full text-xs"
                      size="sm"
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
                      <p className="text-[9px] text-center text-muted-foreground">
                        Unsynced changes
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Sign Out */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground hover:text-destructive"
                  size="sm"
                  onClick={signOut}
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Feature Showcase */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-muted/50 to-background">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                <img
                  src="/icon-192.png"
                  alt="App Icon"
                  className="w-7 h-7 object-contain rounded"
                />
              </div>
              <h2 className="text-xl font-bold mb-2">Powerful Features</h2>
              <p className="text-sm text-muted-foreground">
                Manage your code snippets efficiently
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rich Snippets */}
              <div className="p-5 bg-card border rounded-xl hover:border-primary/50 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <Code className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">Rich Snippets</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Syntax highlighting, multiple languages, rich text formatting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Smart Clipboard */}
              <div className="p-5 bg-card border rounded-xl hover:border-primary/50 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                    <ClipboardCopy className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">Smart Clipboard</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Capture clipboard automatically, organize and paste with shortcuts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cloud Sync */}
              <div className="p-5 bg-card border rounded-xl hover:border-primary/50 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <Cloud className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">Cloud Sync</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Access snippets from any desktop. Manual sync puts you in control.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="p-5 bg-card border rounded-xl hover:border-primary/50 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                    <Lock className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">Secure Storage</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Row-level security with encryption. Only you can access your data.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Start */}
            <div className="mt-8 p-5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
              <h3 className="text-xs font-semibold text-center mb-4">Quick Start</h3>
              <div className="flex flex-col gap-3">
                {/* Create Snippet */}
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium">Create new snippet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 px-3 text-xs"
                      onClick={() => {
                        const event = new KeyboardEvent('keydown', {
                          key: 'n',
                          metaKey: isMac,
                          ctrlKey: !isMac
                        })
                        window.dispatchEvent(event)
                      }}
                    >
                      Try it
                    </Button>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">
                      {isMac ? '⌘ N' : 'Ctrl N'}
                    </kbd>
                  </div>
                </div>

                {/* Open Clipboard */}
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="flex items-center gap-2">
                    <ClipboardCopy className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium">Open clipboard popup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Shortcut:</span>
                    <kbd className="px-2 py-1 text-[10px] font-medium bg-muted border border-border rounded">
                      {isMac ? '⌘ Shift C' : 'Ctrl Shift C'}
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            {!isSignedIn && (
              <div className="mt-8 p-5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="text-sm font-semibold mb-2">Ready to get started?</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Sign in now to enable cloud sync and access your snippets from any desktop
                </p>
                {isSupabaseConfigured() && (
                  <Button
                    type="button"
                    className="h-9 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
                    onClick={handleGoogleSignIn}
                    disabled={isAuthenticating}
                  >
                    {isAuthenticating ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
