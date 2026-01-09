import { User, Cloud, RefreshCw, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import { SignInButton, SignOutButton, SignUpButton, useUser } from '@clerk/clerk-react'
import { authService } from '@/lib/auth'
import { syncService } from '@/lib/sync'
import { isClerkConfigured } from '@/lib/clerk'

export function AccountPanel({ 
  hasUnsyncedChanges, 
  onSyncComplete, 
  onSyncStart,
  lastSyncTime: externalLastSyncTime 
}) {
  const { isSignedIn, user: clerkUser } = useUser()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [error, setError] = useState(null)
  const [localLastSyncTime, setLocalLastSyncTime] = useState(null)
  const [syncApproval, setSyncApproval] = useState(null)
  const [checkingApproval, setCheckingApproval] = useState(false)
  
  const lastSyncTime = externalLastSyncTime || localLastSyncTime

  // Sync Clerk user with auth service
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      authService.setUser(clerkUser)
      checkApprovalStatus()
    } else {
      authService.clearUser()
      setSyncApproval(null)
    }
  }, [isSignedIn, clerkUser])

  const checkApprovalStatus = async () => {
    const email = clerkUser?.primaryEmailAddress?.emailAddress
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
    const email = clerkUser?.primaryEmailAddress?.emailAddress
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

  const handleSync = async () => {
    const email = clerkUser?.primaryEmailAddress?.emailAddress
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
  }, [isSignedIn, syncApproval, hasUnsyncedChanges, clerkUser])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-2 border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold">Account</h1>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">DEVELOPMENT</Badge>
        </div>
      </div>

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

            {!isClerkConfigured() && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-md mb-3">
                <p className="text-[10px] text-amber-600">
                  Clerk not configured. Add VITE_CLERK_PUBLISHABLE_KEY to .env
                </p>
              </div>
            )}

            <SignInButton mode="modal">
              <Button 
                className="w-full"
                variant="default"
                disabled={!isClerkConfigured()}
              >
                Sign In
              </Button>
            </SignInButton>

            <SignUpButton mode="modal">
              <Button 
                className="w-full"
                variant="outline"
                disabled={!isClerkConfigured()}
              >
                Sign Up
              </Button>
            </SignUpButton>

            <div className="pt-3 border-t">
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                <Cloud className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p>Your snippets will be synced securely to the cloud</p>
              </div>
            </div>
          </div>
        ) : (
          // Logged In View
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-accent rounded-md border">
              {clerkUser?.imageUrl ? (
                <img 
                  src={clerkUser.imageUrl} 
                  alt="User avatar" 
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  {clerkUser?.firstName?.[0]?.toUpperCase() || clerkUser?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {clerkUser?.firstName || clerkUser?.username || clerkUser?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {clerkUser?.primaryEmailAddress?.emailAddress}
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
                            End-to-End Encryption Enabled
                          </p>
                          <p className="text-[9px] text-green-600/80">
                            Your snippets are encrypted in the cloud
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    variant={hasUnsyncedChanges ? "default" : "secondary"}
                    className="w-full justify-start gap-2" 
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing || !hasUnsyncedChanges}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="text-xs">
                      {isSyncing ? 'Syncing...' : hasUnsyncedChanges ? 'Sync Now' : 'All Synced'}
                    </span>
                  </Button>

                  {lastSyncTime && (
                    <p className="text-[9px] text-muted-foreground text-center">
                      Last synced: {lastSyncTime.toLocaleTimeString()}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="pt-3 border-t">
              <SignOutButton>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="sm"
                >
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
