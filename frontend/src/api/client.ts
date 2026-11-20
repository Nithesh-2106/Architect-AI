import axios from 'axios'
import { ProjectBrief, SessionSummary } from '../types'

const api = axios.create({ baseURL: '/api' })

export const createSession = async (brief: ProjectBrief): Promise<{ session_id: string }> => {
  const { data } = await api.post('/sessions', brief)
  return data
}

export const listSessions = async (): Promise<SessionSummary[]> => {
  const { data } = await api.get('/sessions')
  return data
}

export const getSession = async (id: string) => {
  const { data } = await api.get(`/sessions/${id}`)
  return data
}
