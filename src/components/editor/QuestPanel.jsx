import React, { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { useStore } from '../../store/useStore'
import { Btn, Input, Textarea } from '../ui'
import { QUEST_STATUS } from '../../utils/constants'
import { getDependents, wouldCreateCycle } from '../../utils/graph'
import toast from 'react-hot-toast'

const MAX_ATTACHMENT_BYTES = 900 * 1024

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'))
    reader.readAsDataURL(file)
  })
}

export default function QuestPanel() {
  const {
    quests, selectedQuestId, isPanelOpen, closePanel,
    updateQuest, completeQuest, uncompleteQuest, deleteQuest, redirectAndDeleteQuest,
    addDependency, removeDependency,
    addQuestAttachments, removeQuestAttachment,
  } = useStore()

  const quest = quests.find(q => q.id === selectedQuestId)

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [xp, setXp] = useState(50)
  const [showDelModal, setShowDelModal] = useState(false)
  const [showRedirect, setShowRedirect] = useState(false)
  const [redirectTarget, setRedirectTarget] = useState('')

  // Sync fields when quest changes
  useEffect(() => {
    if (quest) { setTitle(quest.title); setDesc(quest.description || ''); setXp(quest.xp) }
  }, [quest?.id])

  // Save on blur
  function saveField() {
    if (!quest) return
    const t = title.trim()
    if (!t && quest.status === QUEST_STATUS.DRAFT) {
      // Empty draft → delete silently
      deleteQuest(quest.id)
      return
    }
    updateQuest(quest.id, {
      title: t || quest.title,
      description: desc,
      xp: Math.max(0, Math.min(9999, Number.parseInt(xp, 10) || 0)),
      status: t && quest.status === QUEST_STATUS.DRAFT ? QUEST_STATUS.ACTIVE : quest.status,
    })
  }

  function handleDelete() {
    const deps = getDependents(quests, quest.id)
    if (deps.length > 0) {
      setShowDelModal(true)
    } else {
      deleteQuest(quest.id)
    }
  }

  function handleDeleteConfirm(option) {
    if (option === 'redirect') {
      redirectAndDeleteQuest(quest.id, redirectTarget || null)
    } else {
      deleteQuest(quest.id)
    }
    setShowDelModal(false)
    setShowRedirect(false)
  }

  async function handleAttachmentUpload(e) {
    if (!quest) return
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    const accepted = []
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name} depasse 900 Ko`)
        continue
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        accepted.push({
          id: nanoid(),
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          createdAt: Date.now(),
        })
      } catch {
        toast.error(`Lecture impossible: ${file.name}`)
      }
    }

    if (accepted.length > 0) {
      addQuestAttachments(quest.id, accepted)
      toast.success(`${accepted.length} fichier${accepted.length > 1 ? 's ajoutes' : ' ajoute'}`)
    }
  }

  if (!isPanelOpen || !quest) return null

  const chapterQuests = quests.filter(q => q.chapterId === quest.chapterId && q.id !== quest.id)
  const availablePrereqs = chapterQuests.filter(q =>
    !quest.dependencies.includes(q.id) && !wouldCreateCycle(quests, q.id, quest.id)
  )
  const dependents = getDependents(quests, quest.id)

  const statusBtns = [
    { val: QUEST_STATUS.LOCKED, label: 'Verrouillée', disabled: quest.dependencies.length === 0 },
    { val: QUEST_STATUS.ACTIVE, label: 'En cours', disabled: false },
    { val: QUEST_STATUS.DONE, label: 'Complétée', disabled: false },
  ]

  return (
    <>
      <div className="w-64 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col animate-slideInRight h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-500">Éditer la quête</span>
          <button onClick={() => { saveField(); closePanel() }}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Status selector */}
        <div className="flex gap-1 px-4 py-2.5 border-b border-gray-100">
          {statusBtns.map(s => (
            <button key={s.val}
              disabled={s.disabled}
              onClick={() => {
                if (s.val === QUEST_STATUS.DONE) {
                  if (quest.status === QUEST_STATUS.DONE) uncompleteQuest(quest.id)
                  else completeQuest(quest.id)
                } else if (quest.status === QUEST_STATUS.DONE) {
                  uncompleteQuest(quest.id)
                } else {
                  updateQuest(quest.id, { status: s.val })
                }
              }}
              className="flex-1 text-xs py-1.5 rounded-md border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={quest.status === s.val ? {
                background: s.val === 'done' ? '#E1F5EE' : s.val === 'active' ? '#FAEEDA' : '#F1EFE8',
                color: s.val === 'done' ? '#085041' : s.val === 'active' ? '#412402' : '#5F5E5A',
                borderColor: s.val === 'done' ? '#1D9E75' : s.val === 'active' ? '#EF9F27' : '#B4B2A9',
                fontWeight: 500,
              } : { borderColor: '#E5E5E0', color: '#888780', background: 'white' }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <Input label="Titre" value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveField}
            placeholder="Nom de la quête"
            disabled={quest.status === QUEST_STATUS.DONE}
          />

          <Textarea label="Description" value={desc}
            onChange={e => setDesc(e.target.value)}
            onBlur={saveField}
            placeholder="Détails…"
            rows={3}
          />

          <div>
            <label htmlFor="quest-xp" className="block text-xs text-gray-400 mb-1 font-medium">Points XP</label>
            <div className="flex items-center gap-2">
              <input id="quest-xp" type="number" min="0" max="9999" value={xp}
                onChange={e => setXp(e.target.value)}
                onBlur={saveField}
                disabled={quest.status === QUEST_STATUS.DONE}
                className="w-20 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:border-purple-400 outline-none transition-colors"
              />
              <span className="text-xs text-gray-400">XP à la complétion</span>
              <span className="text-xs text-teal-700">= {(Number.parseInt(xp, 10) || 0).toLocaleString()} EUR</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-400 font-medium">Fichiers & images</p>
              <label className="text-xs px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer text-gray-600">
                + Ajouter
                <input type="file" multiple className="hidden" onChange={handleAttachmentUpload} />
              </label>
            </div>

            <div className="space-y-1.5">
              {(quest.attachments || []).length === 0 && (
                <p className="text-xs text-gray-300 italic">Aucun fichier joint</p>
              )}

              {(quest.attachments || []).map(att => (
                <div key={att.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 truncate max-w-[150px]">{att.name}</p>
                    <p className="text-[10px] text-gray-400">{Math.max(1, Math.round((att.size || 0) / 1024))} Ko</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={att.dataUrl} target="_blank" rel="noreferrer"
                      className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-white">
                      Ouvrir
                    </a>
                    <button type="button" onClick={() => removeQuestAttachment(quest.id, att.id)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50">
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prerequisites */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1.5">Prérequis</p>
            <div className="space-y-1.5">
              {quest.dependencies.map(depId => {
                const dep = quests.find(q => q.id === depId)
                if (!dep) return null
                return (
                  <div key={depId} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: dep.status === 'done' ? '#1D9E75' : '#B4B2A9' }} />
                      <span className="text-xs text-gray-700 truncate max-w-[120px]">{dep.title}</span>
                    </div>
                    <button onClick={() => removeDependency(quest.id, depId)}
                      className="text-gray-300 hover:text-gray-500 text-sm ml-1 flex-shrink-0">×</button>
                  </div>
                )
              })}
              {availablePrereqs.length > 0 && (
                <select
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-gray-200 bg-white text-gray-400 outline-none cursor-pointer"
                  value=""
                  onChange={e => { if (e.target.value) addDependency(quest.id, e.target.value) }}
                >
                  <option value="">+ Ajouter un prérequis…</option>
                  {availablePrereqs.map(q => (
                    <option key={q.id} value={q.id}>{q.title || '(sans titre)'}</option>
                  ))}
                </select>
              )}
              {availablePrereqs.length === 0 && quest.dependencies.length === 0 && (
                <p className="text-xs text-gray-300 italic">Aucun prérequis disponible</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          {quest.status !== QUEST_STATUS.DONE && (
            <Btn onClick={() => completeQuest(quest.id)} variant="success" className="w-full justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Marquer comme faite
            </Btn>
          )}
          {quest.status === QUEST_STATUS.DONE && (
            <Btn onClick={() => uncompleteQuest(quest.id)} variant="default" className="w-full justify-center">
              Devalider la quete
            </Btn>
          )}
          <Btn onClick={handleDelete} variant="danger" className="w-full justify-center" size="sm">
            Supprimer cette quête
          </Btn>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl border border-gray-100 w-full max-w-md animate-scaleIn"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Supprimer "{quest.title}"</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 mb-3">
                Cette quête est un prérequis de <strong>{dependents.length} quête{dependents.length > 1 ? 's' : ''}</strong> :
              </p>
              <ul className="mb-4 space-y-1">
                {dependents.map(d => (
                  <li key={d.id} className="text-xs text-gray-500 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    {d.title}
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50"
                  style={{
                    borderColor: !showRedirect ? '#7F77DD' : '#E5E5E0',
                    background: !showRedirect ? '#EEEDFE' : 'white'
                  }}>
                  <input type="radio" name="del_opt" checked={!showRedirect}
                    onChange={() => setShowRedirect(false)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Supprimer les liens</p>
                    <p className="text-xs text-gray-500 mt-0.5">Les quêtes dépendantes se déverrouillent.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50"
                  style={{
                    borderColor: showRedirect ? '#7F77DD' : '#E5E5E0',
                    background: showRedirect ? '#EEEDFE' : 'white'
                  }}>
                  <input type="radio" name="del_opt" checked={showRedirect}
                    onChange={() => setShowRedirect(true)} className="mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Rediriger les liens</p>
                    <p className="text-xs text-gray-500 mt-0.5 mb-2">Remplacer par une autre quête.</p>
                    {showRedirect && (
                      <select value={redirectTarget} onChange={e => setRedirectTarget(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white outline-none">
                        <option value="">Choisir un remplacement…</option>
                        {chapterQuests.filter(q => q.id !== quest.id).map(q => (
                          <option key={q.id} value={q.id}>{q.title || '(sans titre)'}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <Btn onClick={() => setShowDelModal(false)} variant="default">Annuler</Btn>
              <Btn onClick={() => handleDeleteConfirm(showRedirect ? 'redirect' : 'delete')}
                variant="danger"
                disabled={showRedirect && !redirectTarget}>
                Confirmer la suppression
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
