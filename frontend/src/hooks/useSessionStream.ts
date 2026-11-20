import { useEffect, useRef, useCallback } from 'react'
import { useDebateStore } from '../store/debateStore'
import { getSession } from '../api/client'
import { FinalArchitecture } from '../types'

export function useSessionStream(sessionId: string | null) {
  const { dispatch, resetDebate, setSessionId } = useDebateStore()
  const esRef = useRef<EventSource | null>(null)
  const reconnectDelay = useRef(1000)

  const connect = useCallback((id: string) => {
    if (esRef.current) {
      esRef.current.close()
    }

    const es = new EventSource(`/api/sessions/${id}/stream`)
    esRef.current = es

    const EVENT_TYPES = [
      'phase.started', 'phase.complete',
      'agent.started', 'agent.thinking', 'agent.error',
      'agent.proposal.draft', 'agent.proposal.revised',
      'agent.critique.issued', 'agent.revising',
      'agent.vote.cast',
      'validation.result', 'validation.block',
      'cost.projection',
      'ml.infrastructure.ready',
      'sustainability.scored',
      'convergence.score',
      'finaliser.complete',
      'document.ready',
      'session.completed', 'session.failed', 'session.degraded',
    ]

    EVENT_TYPES.forEach(eventType => {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data)
          reconnectDelay.current = 1000  // reset delay on success
          dispatch(parsed)

          // When session completes or fails, fetch final data and close the stream
          if (eventType === 'session.completed' || eventType === 'session.failed') {
            es.close();
            if (eventType === 'session.completed') {
              getSession(id).then(sessionData => {
                if (sessionData.architecture) {
                  useDebateStore.setState({ finalArchitecture: sessionData.architecture as FinalArchitecture })
                }
              }).catch(console.error)
            }
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err)
        }
      })
    })

    es.addEventListener('error', () => {
      es.close()
      esRef.current = null
      // Exponential back-off reconnect
      setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
        connect(id)
      }, reconnectDelay.current)
    })

    return es
  }, [dispatch])

  useEffect(() => {
    if (!sessionId) return
    setSessionId(sessionId)
    connect(sessionId)

    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [sessionId, connect, setSessionId])

  const disconnect = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
  }, [])

  return { disconnect }
}
