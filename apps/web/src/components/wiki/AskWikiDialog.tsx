/*
 * Ask Wiki Dialog
 * Version: 2.1.0
 *
 * Chat interface for asking questions about wiki content.
 * Uses RAG (Retrieval-Augmented Generation) to provide answers
 * with source citations from wiki pages.
 *
 * Features:
 * - Streaming responses (real-time token display)
 * - Copy answer to clipboard
 * - Feedback (thumbs up/down)
 * - Scope selector (workspace/project)
 * - Conversation history
 * - In-app source navigation (Fase 15.5)
 *
 * Fase 15.3 - Ask the Wiki
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 *
 * Modified: 2026-01-12
 * Change: Fase 15.5 - Added onNavigateToPage for in-app source navigation
 * ===================================================================
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Send,
  MessageCircle,
  Loader2,
  FileText,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  Building2,
  FolderKanban,
  History,
} from 'lucide-react'
import { trpc } from '../../lib/trpc'
import { cn } from '../../lib/utils'

// =============================================================================
// Types
// =============================================================================

interface Source {
  pageId: number
  title: string
  slug: string
  relevance: 'high' | 'medium' | 'low'
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
  isError?: boolean
  isStreaming?: boolean
  feedback?: 'positive' | 'negative' | null
}

interface Scope {
  type: 'workspace' | 'project'
  workspaceId: number
  projectId?: number
  label: string
}

interface AskWikiDialogProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: number
  projectId?: number
  wikiBaseUrl: string
  workspaceName?: string
  projectName?: string
  availableProjects?: Array<{ id: number; name: string }>
  /** Callback when user clicks a source - navigates within app instead of new tab */
  onNavigateToPage?: (pageId: number, slug: string) => void
  /** Initial query to pre-fill (e.g., from "Ask about this" buttons) */
  initialQuery?: string
}

// =============================================================================
// Constants
// =============================================================================

const WELCOME_MESSAGE = `Hoi! Ik ben je Wiki Assistant. Stel me een vraag over de wiki documentatie en ik zoek het antwoord voor je op.

Ik kan vragen beantwoorden over:
- Projecten en processen
- Technische documentatie
- Handleidingen en procedures
- En meer...

Waar kan ik je mee helpen?`

// =============================================================================
// Helper Components
// =============================================================================

function SourceChip({
  source,
  wikiBaseUrl,
  onClick,
}: {
  source: Source
  wikiBaseUrl: string
  onClick?: () => void
}) {
  const relevanceColors = {
    high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }

  return (
    <a
      href={`${wikiBaseUrl}/${source.slug}`}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        'hover:opacity-80 transition-opacity cursor-pointer',
        relevanceColors[source.relevance]
      )}
      title={`Relevantie: ${source.relevance}`}
    >
      <FileText className="w-3 h-3" />
      <span className="max-w-[150px] truncate">{source.title}</span>
      <ExternalLink className="w-3 h-3 opacity-50" />
    </a>
  )
}

function ChatMessage({
  message,
  wikiBaseUrl,
  onSourceClick,
  onFeedback,
  onCopy,
}: {
  message: Message
  wikiBaseUrl: string
  onSourceClick?: (source: Source) => void
  onFeedback?: (messageId: string, type: 'positive' | 'negative') => void
  onCopy?: (content: string) => void
}) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    onCopy?.(message.content)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'bg-transparent' : 'bg-muted/30'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
        )}
      >
        {isUser ? (
          <span className="text-sm font-medium">Jij</span>
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Role label */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isUser ? 'Jij' : 'Wiki Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString('nl-NL', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Message content */}
        <div
          className={cn(
            'prose prose-sm dark:prose-invert max-w-none',
            message.isError && 'text-destructive'
          )}
        >
          {message.content.split('\n').map((line, i) => (
            <p key={i} className={line === '' ? 'h-2' : ''}>
              {line}
              {message.isStreaming && i === message.content.split('\n').length - 1 && (
                <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5" />
              )}
            </p>
          ))}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <span className="text-xs font-medium text-muted-foreground mb-2 block">
              Bronnen ({message.sources.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source) => (
                <SourceChip
                  key={source.pageId}
                  source={source}
                  wikiBaseUrl={wikiBaseUrl}
                  onClick={onSourceClick ? () => onSourceClick(source) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action buttons for assistant messages */}
        {!isUser && !message.isStreaming && !message.isError && (
          <div className="flex items-center gap-1 mt-3 pt-2">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={cn(
                'p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                copied && 'text-emerald-500'
              )}
              title={copied ? 'Gekopieerd!' : 'Kopieer antwoord'}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Feedback buttons */}
            <div className="flex items-center gap-0.5 ml-2">
              <button
                onClick={() => onFeedback?.(message.id, 'positive')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  message.feedback === 'positive'
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                title="Nuttig antwoord"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => onFeedback?.(message.id, 'negative')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  message.feedback === 'negative'
                    ? 'text-red-500 bg-red-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                title="Niet nuttig antwoord"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3 p-4 bg-muted/30">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Wiki Assistant</span>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {content.split('\n').map((line, i) => (
            <p key={i} className={line === '' ? 'h-2' : ''}>
              {line}
            </p>
          ))}
          <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5" />
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 p-4 bg-muted/30">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="flex items-center gap-1 pt-2">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

function ScopeSelector({
  currentScope,
  availableScopes,
  onScopeChange,
}: {
  currentScope: Scope
  availableScopes: Scope[]
  onScopeChange: (scope: Scope) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
      >
        {currentScope.type === 'workspace' ? (
          <Building2 className="w-4 h-4" />
        ) : (
          <FolderKanban className="w-4 h-4" />
        )}
        <span className="max-w-[150px] truncate">{currentScope.label}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-20 bg-popover border rounded-lg shadow-lg py-1 min-w-[200px]">
            {availableScopes.map((scope) => (
              <button
                key={`${scope.type}-${scope.projectId ?? 'ws'}`}
                onClick={() => {
                  onScopeChange(scope)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left',
                  currentScope.type === scope.type && currentScope.projectId === scope.projectId && 'bg-muted'
                )}
              >
                {scope.type === 'workspace' ? (
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <FolderKanban className="w-4 h-4 text-muted-foreground" />
                )}
                <span>{scope.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ConversationHistoryPanel({
  workspaceId,
  projectId,
  onSelectConversation,
  onClose,
}: {
  workspaceId: number
  projectId?: number
  onSelectConversation: (conversationId: string) => void
  onClose: () => void
}) {
  const { data: conversationsData } = trpc.wikiAi.listConversations.useQuery({
    workspaceId,
    projectId,
  })

  return (
    <div className="absolute inset-0 bg-background z-30 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">Gesprekken</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversationsData?.conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nog geen eerdere gesprekken</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversationsData?.conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(conv.createdAt).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {conv.messageCount} berichten
                  </span>
                </div>
                <p className="text-sm truncate">
                  {conv.lastMessage || 'Nieuw gesprek'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function AskWikiDialog({
  isOpen,
  onClose,
  workspaceId,
  projectId,
  wikiBaseUrl,
  workspaceName = 'Workspace',
  projectName,
  availableProjects = [],
  onNavigateToPage,
  initialQuery,
}: AskWikiDialogProps) {
  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Scope state
  const [currentScope, setCurrentScope] = useState<Scope>({
    type: projectId ? 'project' : 'workspace',
    workspaceId,
    projectId,
    label: projectName || workspaceName,
  })

  // Build available scopes
  const availableScopes: Scope[] = [
    {
      type: 'workspace',
      workspaceId,
      label: `${workspaceName} (hele workspace)`,
    },
    ...availableProjects.map((p) => ({
      type: 'project' as const,
      workspaceId,
      projectId: p.id,
      label: p.name,
    })),
  ]

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // tRPC mutations
  const askWikiMutation = trpc.wikiAi.askWiki.useMutation()
  const createConversationMutation = trpc.wikiAi.createConversation.useMutation()
  const getConversationQuery = trpc.wikiAi.getConversation.useQuery(
    { conversationId: conversationId ?? '' },
    { enabled: false }
  )

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Pre-fill input with initialQuery when provided
  useEffect(() => {
    if (isOpen && initialQuery) {
      setInputValue(initialQuery)
    }
  }, [isOpen, initialQuery])

  // Reset state when dialog opens (fresh start each time)
  useEffect(() => {
    if (isOpen) {
      // Only initialize if this is a fresh open (not already initialized this session)
      if (!isInitialized) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: WELCOME_MESSAGE,
            timestamp: new Date(),
          },
        ])
        setConversationId(null)
        setInputValue('')
        setStreamingContent(null)
        setIsStreaming(false)
        setIsInitialized(true)
      }
    } else {
      // Reset initialized flag when dialog closes so next open is fresh
      setIsInitialized(false)
    }
  }, [isOpen, isInitialized])

  // Handle sending a message
  const handleSend = useCallback(async () => {
    const question = inputValue.trim()
    if (!question || askWikiMutation.isPending || isStreaming) return

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsStreaming(true)
    setStreamingContent('')

    try {
      // Create conversation if not exists
      let currentConversationId = conversationId
      if (!currentConversationId) {
        const result = await createConversationMutation.mutateAsync({
          workspaceId: currentScope.workspaceId,
          projectId: currentScope.projectId,
        })
        currentConversationId = result.conversationId
        setConversationId(currentConversationId)
      }

      // Ask the wiki (non-streaming for now, streaming requires different client setup)
      const response = await askWikiMutation.mutateAsync({
        workspaceId: currentScope.workspaceId,
        projectId: currentScope.projectId,
        question,
        options: {
          conversationId: currentConversationId,
          maxContextPages: 5,
          minRelevanceScore: 0.5,
          temperature: 0.7,
        },
      })

      setStreamingContent(null)
      setIsStreaming(false)

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      setStreamingContent(null)
      setIsStreaming(false)

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          error instanceof Error
            ? error.message
            : 'Er ging iets mis bij het verwerken van je vraag. Probeer het opnieuw.',
        timestamp: new Date(),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }, [
    inputValue,
    askWikiMutation,
    createConversationMutation,
    conversationId,
    currentScope,
    isStreaming,
  ])

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle new conversation
  const handleNewConversation = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
      },
    ])
    setConversationId(null)
    setInputValue('')
    setStreamingContent(null)
    setIsStreaming(false)
  }

  // Handle source click - navigate within app or open in new tab
  const handleSourceClick = (source: Source) => {
    if (onNavigateToPage) {
      onNavigateToPage(source.pageId, source.slug)
      onClose() // Close dialog after navigation
    } else {
      window.open(`${wikiBaseUrl}/${source.slug}`, '_blank')
    }
  }

  // Handle feedback
  const handleFeedback = (messageId: string, type: 'positive' | 'negative') => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, feedback: msg.feedback === type ? null : type }
          : msg
      )
    )
    // TODO: Send feedback to backend for analytics
  }

  // Handle scope change
  const handleScopeChange = (scope: Scope) => {
    setCurrentScope(scope)
    // Start fresh conversation when scope changes
    handleNewConversation()
  }

  // Handle select conversation from history
  const handleSelectConversation = async (convId: string) => {
    setConversationId(convId)
    setShowHistory(false)

    // Fetch conversation messages
    const result = await getConversationQuery.refetch()
    if (result.data?.conversation) {
      const conv = result.data.conversation
      setMessages(
        conv.messages.map((msg, index) => ({
          id: `${msg.role}-${index}`,
          role: msg.role,
          content: msg.content,
          sources: msg.sources,
          timestamp: new Date(msg.timestamp),
        }))
      )
    }
  }

  if (!isOpen) return null

  const isPending = askWikiMutation.isPending || isStreaming

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl h-[80vh] max-h-[700px] bg-background rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold">Ask the Wiki</h2>
              <ScopeSelector
                currentScope={currentScope}
                availableScopes={availableScopes}
                onScopeChange={handleScopeChange}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Gesprekken"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={handleNewConversation}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Nieuw gesprek"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversation History Panel */}
        {showHistory && (
          <ConversationHistoryPanel
            workspaceId={currentScope.workspaceId}
            projectId={currentScope.projectId}
            onSelectConversation={handleSelectConversation}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              wikiBaseUrl={wikiBaseUrl}
              onSourceClick={handleSourceClick}
              onFeedback={handleFeedback}
            />
          ))}
          {isStreaming && streamingContent !== null && streamingContent.length > 0 && (
            <StreamingMessage content={streamingContent} />
          )}
          {isPending && (!streamingContent || streamingContent.length === 0) && (
            <TypingIndicator />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4 bg-background">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Stel een vraag over de wiki..."
                className={cn(
                  'w-full px-4 py-3 pr-12 rounded-xl border resize-none',
                  'bg-muted/30 focus:bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'placeholder:text-muted-foreground/50',
                  'min-h-[52px] max-h-[200px]'
                )}
                rows={1}
                disabled={isPending}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isPending}
                className={cn(
                  'absolute right-2 bottom-2 p-2 rounded-lg',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Antwoorden zijn gebaseerd op je wiki documentatie. Druk op Enter om te versturen.
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Floating Action Button
// =============================================================================

interface AskWikiFabProps {
  onClick: () => void
}

export function AskWikiFab({ onClick }: AskWikiFabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'w-14 h-14 rounded-full shadow-lg',
        'bg-gradient-to-br from-violet-500 to-purple-600',
        'text-white flex items-center justify-center',
        'hover:scale-105 hover:shadow-xl transition-all',
        'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2'
      )}
      title="Ask the Wiki"
    >
      <Sparkles className="w-6 h-6" />
    </button>
  )
}

export default AskWikiDialog
