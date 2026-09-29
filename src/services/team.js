import { supabase } from '../config/supabase'
import { publicOrigin } from './links'

const rpc = async (name, args) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    return data
}

export const loadTeam = (businessId) => rpc('team_members', { p_business_id: businessId })
export const addTeamMember = (businessId, name) => rpc('add_team_member', { p_business_id: businessId, p_name: name })
export const updateTeamMember = (memberId, name, bookable) => rpc('update_team_member', { p_member_id: memberId, p_name: name, p_bookable: bookable })
export const setMemberServices = (memberId, serviceIds) => rpc('set_member_services', { p_member_id: memberId, p_service_ids: serviceIds })
export const memberInviteLink = (memberId, renew = false) => rpc('member_invite_link', { p_member_id: memberId, p_renew: renew })
export const removeTeamMember = (memberId) => rpc('remove_team_member', { p_member_id: memberId })
export const teamInviteInfo = (token) => rpc('team_invite_info', { p_token: token })
export const acceptTeamInvite = (token) => rpc('accept_team_invite', { p_token: token })

export const teamInviteUrl = (token) => `${publicOrigin()}/team/${token}`

// Back to the business hours: their own rows go, and the business week applies again.
export const clearMemberHours = async (businessId, memberId) => {
    const { error } = await supabase.from('availability').delete().eq('business_id', businessId).eq('staff_id', memberId)
    if (error) throw error
}

export const doesService = (member, serviceId) => member.services.length === 0 || member.services.includes(serviceId)
