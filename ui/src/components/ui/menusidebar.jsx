import { FileCode, User, Clipboard } from 'lucide-react'

export function MenuSidebar({ activeMenu, onMenuChange, sidebarCollapsed }) {
  const menuItems = [
    { id: 'snippets', icon: FileCode, label: 'Snippets', badge: null },
    { id: 'clipboard', icon: Clipboard, label: 'Clipboard', badge: null },
    { id: 'account', icon: User, label: 'Account', badge: 'DEV' }
  ]

  return (
    <div className="h-full w-14 border-r flex flex-col items-center py-2 gap-1 bg-background relative overflow-hidden">
      {/* Gradient background overlay matching SearchBar */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
      
      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = activeMenu === item.id
        
        return (
          <button
            key={item.id}
            onClick={() => onMenuChange(item.id)}
            className={`relative w-10 h-10 flex items-center justify-center rounded-md transition-all group z-10 ${
              isActive 
                ? 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/30' 
                : 'hover:bg-accent border border-transparent'
            }`}
            title={item.label}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-r" />
            )}
            
            <Icon className={`h-4 w-4 transition-colors ${
              isActive 
                ? 'text-purple-600' 
                : 'text-muted-foreground group-hover:text-foreground'
            }`} />
            
          </button>
        )
      })}
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Version indicator or other bottom content can go here */}
      <div className="text-[8px] text-muted-foreground/50 z-10">v1.3.3</div>
    </div>
  )
}
