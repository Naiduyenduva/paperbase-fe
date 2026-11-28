import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../lib/api'

type DocumentRecord = {
  id: string
  name: string
  createdAt: string | null
  updatedAt: string | null
  metadata?: {
    size?: number
    mimetype?: string
  } | null
}

type DocumentsResponse = {
  documents: DocumentRecord[]
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

type DocumentMessage = {
  text: string
  isError: boolean
}

type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
}

const TOKEN_KEY = 'paperbase_token'
const MAX_FILE_SIZE = 20 * 1024 * 1024

function getDocuments(token: string, offset = 0) {
  return apiRequest<DocumentsResponse>(
    `/api/documents?limit=100&offset=${offset}`,
    { method: 'GET' },
    token,
  )
}

function formatFileSize(size?: number) {
  if (size === undefined || !Number.isFinite(size)) return 'Document'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDocumentDate(value: string | null) {
  if (!value) return 'Recently added'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Recently added'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [documentsLoaded, setDocumentsLoaded] = useState(false)
  const [documentsRefreshing, setDocumentsRefreshing] = useState(false)
  const [documentsError, setDocumentsError] = useState('')
  const [documentMessage, setDocumentMessage] = useState<DocumentMessage | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [documentsHasMore, setDocumentsHasMore] = useState(false)
  const [loadingMoreDocuments, setLoadingMoreDocuments] = useState(false)
  const [openChatId, setOpenChatId] = useState<string | null>(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({})
  const [askingDocumentId, setAskingDocumentId] = useState<string | null>(null)
  const activeChatDocument = documents.find((document) => document.id === openChatId)
  const documentsLoading = Boolean(
    localStorage.getItem(TOKEN_KEY) && (!documentsLoaded || documentsRefreshing),
  )

  useEffect(() => {
    let active = true
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) return

    void getDocuments(token)
      .then(({ documents: userDocuments, pagination }) => {
        if (active) {
          setDocuments(userDocuments)
          setDocumentsHasMore(pagination.hasMore)
          setDocumentsError('')
          setDocumentsLoaded(true)
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setDocumentsError(
            cause instanceof Error ? cause.message : 'Unable to load your documents.',
          )
          setDocumentsLoaded(true)
        }
      })

    return () => {
      active = false
    }
  }, [])

  async function reloadDocuments() {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    setDocumentsRefreshing(true)
    setDocumentsError('')
    try {
      const { documents: userDocuments, pagination } = await getDocuments(token)
      setDocuments(userDocuments)
      setDocumentsHasMore(pagination.hasMore)
    } catch (cause) {
      setDocumentsError(
        cause instanceof Error ? cause.message : 'Unable to load your documents.',
      )
    } finally {
      setDocumentsRefreshing(false)
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token || !selectedFile) return

    setDocumentMessage(null)
    setDocumentsError('')
    setUploading(true)

    try {
      await apiRequest<{ document: DocumentRecord }>(
        '/api/documents',
        { method: 'POST', body: new FormData(form) },
        token,
      )
    } catch (cause) {
      setDocumentMessage({
        text: cause instanceof Error ? cause.message : 'Unable to upload this document.',
        isError: true,
      })
      setUploading(false)
      return
    }

    setSelectedFile(null)
    form.reset()
    setDocumentMessage({ text: 'Your document has been uploaded.', isError: false })

    try {
      const { documents: userDocuments, pagination } = await getDocuments(token)
      setDocuments(userDocuments)
      setDocumentsHasMore(pagination.hasMore)
    } catch (cause) {
      setDocumentMessage({
        text: `Uploaded successfully, but ${cause instanceof Error ? cause.message : 'the document list could not be refreshed.'}`,
        isError: true,
      })
    }
    setUploading(false)
  }

  async function handleDownload(document: DocumentRecord) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    const downloadTab = window.open('about:blank', '_blank')
    if (!downloadTab) {
      setDocumentMessage({
        text: 'Allow pop-ups to open your document download.',
        isError: true,
      })
      return
    }

    downloadTab.opener = null
    setDocumentMessage(null)
    try {
      const { url } = await apiRequest<{ url: string }>(
        `/api/documents/${encodeURIComponent(document.id)}/download`,
        { method: 'GET' },
        token,
      )
      downloadTab.location.href = url
    } catch (cause) {
      downloadTab.close()
      setDocumentMessage({
        text: cause instanceof Error ? cause.message : 'Unable to download this document.',
        isError: true,
      })
    }
  }

  async function handleDelete(document: DocumentRecord) {
    if (!window.confirm(`Delete "${document.name}"? This cannot be undone.`)) return

    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    setDeletingId(document.id)
    setDocumentMessage(null)
    try {
      await apiRequest<{ message: string }>(
        `/api/documents/${encodeURIComponent(document.id)}`,
        { method: 'DELETE' },
        token,
      )
      setDocuments((currentDocuments) =>
        currentDocuments.filter((item) => item.id !== document.id),
      )
      if (openChatId === document.id) setOpenChatId(null)
      setDocumentMessage({ text: 'Document deleted.', isError: false })
    } catch (cause) {
      setDocumentMessage({
        text: cause instanceof Error ? cause.message : 'Unable to delete this document.',
        isError: true,
      })
    } finally {
      setDeletingId(null)
    }
  }

  function toggleChat(documentId: string) {
    setOpenChatId((currentId) => currentId === documentId ? null : documentId)
    setChatDraft('')
  }

  async function handleAsk(document: DocumentRecord, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const question = chatDraft.trim()
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token || !question) return

    setAskingDocumentId(document.id)
    setChatMessages((current) => ({
      ...current,
      [document.id]: [...(current[document.id] ?? []), { role: 'user', text: question }],
    }))
    setChatDraft('')

    try {
      const { answer } = await apiRequest<{ answer: string }>(
        '/api/documents/ask',
        {
          method: 'POST',
          body: JSON.stringify({ question, documentId: document.id }),
        },
        token,
      )
      setChatMessages((current) => ({
        ...current,
        [document.id]: [...(current[document.id] ?? []), { role: 'assistant', text: answer }],
      }))
    } catch (cause) {
      setChatMessages((current) => ({
        ...current,
        [document.id]: [
          ...(current[document.id] ?? []),
          {
            role: 'assistant',
            text: cause instanceof Error ? cause.message : 'Unable to answer that question.',
          },
        ],
      }))
    } finally {
      setAskingDocumentId(null)
    }
  }

  async function loadMoreDocuments() {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    setLoadingMoreDocuments(true)
    setDocumentMessage(null)
    try {
      const { documents: nextDocuments, pagination } = await getDocuments(
        token,
        documents.length,
      )
      setDocuments((currentDocuments) => [...currentDocuments, ...nextDocuments])
      setDocumentsHasMore(pagination.hasMore)
    } catch (cause) {
      setDocumentMessage({
        text: cause instanceof Error ? cause.message : 'Unable to load more documents.',
        isError: true,
      })
    } finally {
      setLoadingMoreDocuments(false)
    }
  }

  return (
    <section
      className={`documents-panel${activeChatDocument ? ' documents-panel--chat-open' : ''}`}
      aria-labelledby="documents-title"
    >
      <div className="documents-library">
        <div className="documents-panel__heading">
          <div>
            <span className="card-kicker">Your library</span>
            <h2 id="documents-title">Documents</h2>
            <p>Keep your important files together in one quiet place.</p>
          </div>
          <span className="documents-count">
            {documents.length}{documentsHasMore ? '+' : ''}{' '}
            {documents.length === 1 && !documentsHasMore ? 'document' : 'documents'}
          </span>
        </div>

        <form className="document-upload" onSubmit={handleUpload}>
          <label className="document-file-picker">
            <span className="document-file-picker__icon" aria-hidden="true">＋</span>
            <span className="document-file-picker__copy">
              <strong>{selectedFile ? selectedFile.name : 'Choose a document to upload'}</strong>
              <small>PDF, TXT, or DOCX · up to 20 MB</small>
            </span>
            <input
              accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-label="Choose a PDF, TXT, or DOCX document"
              name="file"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setSelectedFile(file)
                setDocumentMessage(null)
                if (file && file.size > MAX_FILE_SIZE) {
                  setDocumentMessage({
                    text: 'Choose a file smaller than 20 MB.',
                    isError: true,
                  })
                }
              }}
              required
              type="file"
            />
          </label>
          <button
            className="document-upload__button"
            type="submit"
            disabled={uploading || !selectedFile || selectedFile.size > MAX_FILE_SIZE}
          >
            {uploading ? (
              <>
                <span className="button-loader" />
                Uploading…
              </>
            ) : (
              'Upload document'
            )}
          </button>
        </form>

        {documentsError && (
          <div className="document-message document-message--error" role="alert">
            {documentsError}
            <button
              className="document-action"
              type="button"
              onClick={() => void reloadDocuments()}
            >
              Try again
            </button>
          </div>
        )}
        {documentMessage && (
          <div
            className={`document-message${documentMessage.isError ? ' document-message--error' : ''}`}
            role={documentMessage.isError ? 'alert' : 'status'}
          >
            {documentMessage.text}
          </div>
        )}

        {documentsLoading ? (
          <div className="documents-empty" aria-live="polite">
            <span className="loader" />
            <p>Gathering your documents…</p>
          </div>
        ) : documents.length > 0 ? (
          <ul className="document-list" aria-label="Your uploaded documents">
            {documents.map((document) => {
              const extension = document.name.split('.').pop()?.toUpperCase() ?? 'FILE'
              return (
                <li className="document-row" key={document.id}>
                  <span className="document-row__type" aria-hidden="true">{extension}</span>
                  <div className="document-row__details">
                    <strong title={document.name}>{document.name}</strong>
                    <span>
                      {formatFileSize(document.metadata?.size)} · {formatDocumentDate(document.createdAt)}
                    </span>
                  </div>
                  <div className="document-row__actions">
                    <button
                      className="document-action"
                      type="button"
                      onClick={() => void handleDownload(document)}
                    >
                      Download
                    </button>
                    <button
                      className="document-action document-action--delete"
                      type="button"
                      disabled={deletingId === document.id}
                      onClick={() => void handleDelete(document)}
                    >
                      {deletingId === document.id ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      className="document-chat-button"
                      type="button"
                      aria-label={`Chat with ${document.name}`}
                      aria-expanded={openChatId === document.id}
                      title={`Chat with ${document.name}`}
                      onClick={() => toggleChat(document.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M20 11.5a7.5 7.5 0 0 1-7.8 7.5H12l-4.2 2v-3.7A7.5 7.5 0 1 1 20 11.5Z" />
                        <circle cx="9" cy="11.5" r=".7" fill="currentColor" stroke="none" />
                        <circle cx="12" cy="11.5" r=".7" fill="currentColor" stroke="none" />
                        <circle cx="15" cy="11.5" r=".7" fill="currentColor" stroke="none" />
                      </svg>
                    </button>
                  </div>
                </li>
              )
            })}
            {documentsHasMore && (
              <li className="document-list__more">
                <button
                  className="document-action"
                  type="button"
                  disabled={loadingMoreDocuments}
                  onClick={() => void loadMoreDocuments()}
                >
                  {loadingMoreDocuments ? 'Loading…' : 'Load more documents'}
                </button>
              </li>
            )}
          </ul>
        ) : documentsError ? null : (
          <div className="documents-empty">
            <span className="documents-empty__icon" aria-hidden="true">↗</span>
            <strong>Your library is ready</strong>
            <p>Upload a PDF, TXT, or DOCX file to see it here.</p>
          </div>
        )}
      </div>
      {activeChatDocument && (
        <aside className="document-chat" aria-label={`Chat with ${activeChatDocument.name}`}>
          <div className="document-chat__heading">
            <div>
              <span className="card-kicker">Document chat</span>
              <strong>{activeChatDocument.name}</strong>
            </div>
            <button
              className="document-chat__close"
              type="button"
              aria-label="Close document chat"
              onClick={() => toggleChat(activeChatDocument.id)}
            >
              ×
            </button>
          </div>
          <div className="document-chat__messages" aria-live="polite">
            {(chatMessages[activeChatDocument.id]?.length ?? 0) === 0 ? (
              <p>Ask a question about this document.</p>
            ) : (
              chatMessages[activeChatDocument.id].map((message, index) => (
                <div
                  className={`document-chat__message document-chat__message--${message.role}`}
                  key={`${message.role}-${index}`}
                >
                  {message.text}
                </div>
              ))
            )}
          </div>
          <form
            className="document-chat__form"
            onSubmit={(event) => void handleAsk(activeChatDocument, event)}
          >
            <input
              value={chatDraft}
              onChange={(event) => setChatDraft(event.target.value)}
              placeholder="Ask a question..."
              aria-label={`Question about ${activeChatDocument.name}`}
              maxLength={2000}
              disabled={askingDocumentId === activeChatDocument.id}
              required
            />
            <button
              type="submit"
              disabled={askingDocumentId === activeChatDocument.id || !chatDraft.trim()}
            >
              {askingDocumentId === activeChatDocument.id ? 'Thinking…' : 'Ask'}
            </button>
          </form>
        </aside>
      )}
    </section>
  )
}
