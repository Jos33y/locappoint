import { createContext, useContext } from 'react'

export const WorkspaceContext = createContext(null)

export const useWorkspace = () => {
    const workspace = useContext(WorkspaceContext)
    if (!workspace) throw new Error('useWorkspace must be used inside the business shell')
    return workspace
}
