import React, { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { useStore } from '../../store/useStore'
import { Btn, Input } from '../ui'
import { QUEST_STATUS } from '../../utils/constants'
import { getDependents, wouldCreateCycle } from '../../utils/graph'
import toast from 'react-hot-toast'

const MAX_ATTACHMENT_BYTES = 900 * 1024
const DEADLINE_UNITS = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
  months: 30 * 24 * 60 * 60 * 1000,
}

function toDatetimeLocalValue(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatOffset(ms) {
  const minutes = Math.round(ms / 60000)
  if (minutes >= 43200) return `${Math.round(minutes / 43200)} mois`
  if (minutes >= 10080) return `${Math.round(minutes / 10080)} sem`
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} j`
  if (minutes >= 60) return `${Math.round(minutes / 60)} h`
  return `${minutes} min`
}

function formatDeadlinePreview(ts) {
  if (!ts || !Number.isFinite(ts)) return 'Date invalide'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

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
    setQuestDeadline, clearQuestDeadline, reactivateExpiredQuestWithNewDeadline,
  } = useStore()

  const quest = quests.find(q => q.id === selectedQuestId)

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [xp, setXp] = useState(50)
  const [showDelModal, setShowDelModal] = useState(false)
  const [showRedirect, setShowRedirect] = useState(false)
  const [redirectTarget, setRedirectTarget] = useState('')
  const [deadlineMode, setDeadlineMode] = useState('none')
  const [absoluteDeadline, setAbsoluteDeadline] = useState('')
  const [relativeAmount, setRelativeAmount] = useState('30')
  const [relativeUnit, setRelativeUnit] = useState('minutes')
  const [reminderAmount, setReminderAmount] = useState('15')
  const [reminderUnit, setReminderUnit] = useState('minutes')
  const [reminders, setReminders] = useState([])
  const [checklistDraft, setChecklistDraft] = useState('')
  const [checklistItems, setChecklistItems] = useState([])

  // Sync fields when quest changes
  useEffect(() => {
    if (!quest) return
    setTitle(quest.title)
    setDesc(quest.description || '')
    setXp(quest.xp)
    setChecklistDraft('')
    setChecklistItems(Array.isArray(quest.checklistItems) ? quest.checklistItems : [])
    setDeadlineMode(quest.deadlineMode || (quest.deadlineAt ? 'absolute' : 'none'))
    setAbsoluteDeadline(toDatetimeLocalValue(quest.deadlineAt))
    if (quest.durationMs) {
      const minutes = Math.max(1, Math.round(quest.durationMs / DEADLINE_UNITS.minutes))
      setRelativeAmount(String(minutes))
      setRelativeUnit('minutes')
    } else {
      setRelativeAmount('30')
      setRelativeUnit('minutes')
    }
    setReminders(Array.isArray(quest.reminderOffsetsMs) ? quest.reminderOffsetsMs : [])
  }, [quest?.id])

  function getReminderOffsetMs(amount, unit) {
    const n = Number.parseInt(amount, 10)
    if (!Number.isFinite(n) || n <= 0) return null
    const ratio = DEADLINE_UNITS[unit]
    if (!ratio) return null
    return n * ratio
  }

  function resolveDeadlinePayload(modeOverride = deadlineMode) {
    if (modeOverride === 'none') {
      return { deadlineAt: null, deadlineMode: 'none', durationMs: null, reminderOffsetsMs: [] }
    }

    if (modeOverride === 'absolute') {
      const ts = Date.parse(absoluteDeadline)
      if (!Number.isFinite(ts)) return null
      return {
        deadlineAt: ts,
        deadlineMode: 'absolute',
        durationMs: null,
        reminderOffsetsMs: reminders,
      }
    }

    if (modeOverride === 'relative') {
      const durationMs = getReminderOffsetMs(relativeAmount, relativeUnit)
      if (!durationMs) return null
      return {
        deadlineAt: Date.now() + durationMs,
        deadlineMode: 'relative',
        durationMs,
        reminderOffsetsMs: reminders,
      }
    }

    return null
  }

  function handleSaveDeadline() {
    if (!quest) return
    if (deadlineMode === 'none') {
      clearQuestDeadline(quest.id)
      return
    }
    const payload = resolveDeadlinePayload()
    if (!payload) {
      toast.error('Configuration de deadline invalide')
      return
    }
    const ok = setQuestDeadline(quest.id, payload)
    if (ok && payload.deadlineMode === 'absolute') {
      setAbsoluteDeadline(toDatetimeLocalValue(payload.deadlineAt))
    }
  }

  function handleReactivate() {
    if (!quest) return
    const payload = resolveDeadlinePayload(deadlineMode === 'none' ? 'absolute' : deadlineMode)
    if (!payload || !payload.deadlineAt) {
      toast.error('Definissez une nouvelle deadline pour reactiver la quete')
      return
    }
    const ok = reactivateExpiredQuestWithNewDeadline(quest.id, payload)
    if (!ok) return
    setAbsoluteDeadline(toDatetimeLocalValue(payload.deadlineAt))
  }

  function addReminderOffset() {
    const offsetMs = getReminderOffsetMs(reminderAmount, reminderUnit)
    if (!offsetMs) {
      toast.error('Rappel invalide')
      return
    }
    setReminders((prev) => [...new Set([...prev, offsetMs])].sort((a, b) => b - a))
  }

  function saveChecklist(nextItems) {
    if (!quest) return
    setChecklistItems(nextItems)
    updateQuest(quest.id, { checklistItems: nextItems })
  }

  function addChecklistItem() {
    const label = checklistDraft.trim()
    if (!label || !quest || quest.status === QUEST_STATUS.DONE) return
    const nextItems = [...checklistItems, { id: nanoid(), label, done: false }]
    saveChecklist(nextItems)
    setChecklistDraft('')
  }

  function toggleChecklistItem(itemId) {
    if (!quest || quest.status === QUEST_STATUS.DONE) return
    const nextItems = checklistItems.map((item) => (
      item.id === itemId ? { ...item, done: !item.done } : item
    ))
    saveChecklist(nextItems)
  }

  function removeChecklistItem(itemId) {
    if (!quest || quest.status === QUEST_STATUS.DONE) return
    const nextItems = checklistItems.filter((item) => item.id !== itemId)
    saveChecklist(nextItems)
  }

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
    { val: QUEST_STATUS.LOCKED, label: 'Verrouillée', disabled: quest.dependencies.length === 0 || quest.status === QUEST_STATUS.EXPIRED },
    { val: QUEST_STATUS.ACTIVE, label: 'En cours', disabled: quest.status === QUEST_STATUS.EXPIRED },
    { val: QUEST_STATUS.DONE, label: 'Complétée', disabled: quest.status === QUEST_STATUS.EXPIRED },
  ]

  const relativeDurationMs = getReminderOffsetMs(relativeAmount, relativeUnit)
  const checklistDone = checklistItems.filter((item) => item.done).length
  const checklistPct = checklistItems.length > 0
    ? Math.round((checklistDone / checklistItems.length) * 100)
    : 0
  const previewDeadlineAt = deadlineMode === 'absolute'
    ? Date.parse(absoluteDeadline)
    : deadlineMode === 'relative' && relativeDurationMs
      ? Date.now() + relativeDurationMs
      : null

  return (
    <>
      <div className="w-72 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col animate-slideInRight h-full">
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

        {quest.status === QUEST_STATUS.EXPIRED && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs font-medium text-red-700">Quete desactivee pour retard</p>
            <p className="text-xs text-red-600 mt-0.5">Reprogrammez une deadline pour la reactiver.</p>
          </div>
        )}

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <Input label="Titre" value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveField}
            placeholder="Nom de la quête"
            disabled={quest.status === QUEST_STATUS.DONE}
          />

          <div>
            <label htmlFor="quest-description" className="block text-xs text-gray-400 font-medium mb-1">Description</label>
            <textarea
              id="quest-description"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onBlur={saveField}
              placeholder="Details…"
              rows={4}
              disabled={quest.status === QUEST_STATUS.DONE}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-gray-300
              focus:border-purple-400 outline-none transition-colors resize-none text-gray-900 placeholder:text-gray-300"
            />
          </div>

          <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-teal-50/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-teal-800">Checklist d'avancement</p>
              <span className="text-[10px] text-teal-700 font-semibold whitespace-nowrap">{checklistDone}/{checklistItems.length} • {checklistPct}%</span>
            </div>

            <div className="h-2 rounded-full bg-teal-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                style={{ width: `${checklistPct}%` }}
              />
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={checklistDraft}
                onChange={(e) => setChecklistDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addChecklistItem()
                  }
                }}
                disabled={quest.status === QUEST_STATUS.DONE}
                placeholder="Nouvelle etape..."
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-teal-200 bg-white text-gray-700 outline-none focus:border-teal-400"
              />
              <Btn
                type="button"
                size="sm"
                variant="default"
                onClick={addChecklistItem}
                disabled={quest.status === QUEST_STATUS.DONE || !checklistDraft.trim()}
                className="w-full justify-center border-teal-200 text-teal-700 hover:bg-teal-100"
              >
                Ajouter l'etape
              </Btn>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {checklistItems.length === 0 && (
                <p className="text-xs text-gray-500 italic leading-relaxed">Ajoutez des etapes pour suivre l'avancement puis cochez-les au fur et a mesure.</p>
              )}

              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-teal-100 bg-white px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleChecklistItem(item.id)}
                    disabled={quest.status === QUEST_STATUS.DONE}
                    className="accent-teal-600"
                  />
                  <span className={`flex-1 text-xs ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(item.id)}
                    disabled={quest.status === QUEST_STATUS.DONE}
                    className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

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

          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2.5">
            <p className="text-xs text-gray-500 font-medium">Deadline & alarmes</p>
            <div className="grid grid-cols-3 gap-1.5">
              {['none', 'absolute', 'relative'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDeadlineMode(mode)}
                  className="text-xs py-1.5 rounded-md border font-medium"
                  style={deadlineMode === mode
                    ? { borderColor: '#7F77DD', background: '#EEEDFE', color: '#4C478F' }
                    : { borderColor: '#E5E5E0', background: 'white', color: '#666' }}
                >
                  {mode === 'none' ? 'Aucune' : mode === 'absolute' ? 'Date fixe' : 'Duree'}
                </button>
              ))}
            </div>

            {deadlineMode !== 'none' && (
              <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                <p className="text-[11px] text-gray-500">Fermeture prevue</p>
                <p className="text-xs text-gray-700 font-medium mt-0.5">
                  {previewDeadlineAt && Number.isFinite(previewDeadlineAt)
                    ? formatDeadlinePreview(previewDeadlineAt)
                    : 'Definissez une date valide'}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {reminders.length} alarme{reminders.length > 1 ? 's' : ''} configuree{reminders.length > 1 ? 's' : ''}
                </p>
              </div>
            )}

            {deadlineMode === 'absolute' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date limite</label>
                <input
                  type="datetime-local"
                  value={absoluteDeadline}
                  onChange={e => setAbsoluteDeadline(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none"
                />
              </div>
            )}

            {deadlineMode === 'relative' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duree (minutes a mois)</label>
                <div className="grid grid-cols-[96px_1fr] gap-2">
                  <input
                    type="number"
                    min="1"
                    value={relativeAmount}
                    onChange={e => setRelativeAmount(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none"
                  />
                  <select
                    value={relativeUnit}
                    onChange={e => setRelativeUnit(e.target.value)}
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Heures</option>
                    <option value="days">Jours</option>
                    <option value="weeks">Semaines</option>
                    <option value="months">Mois</option>
                  </select>
                </div>
              </div>
            )}

            {deadlineMode !== 'none' && (
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-400">Alarmes avant fermeture</label>
                <div className="grid grid-cols-[96px_1fr] gap-2">
                  <input
                    type="number"
                    min="1"
                    value={reminderAmount}
                    onChange={e => setReminderAmount(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white outline-none"
                  />
                  <select
                    value={reminderUnit}
                    onChange={e => setReminderUnit(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white outline-none"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Heures</option>
                    <option value="days">Jours</option>
                    <option value="weeks">Semaines</option>
                    <option value="months">Mois</option>
                  </select>
                </div>
                <Btn type="button" size="sm" variant="default" onClick={addReminderOffset} className="w-full justify-center">Ajouter cette alarme</Btn>

                <div className="flex flex-wrap gap-1.5">
                  {reminders.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Aucune alarme</span>
                  )}
                  {reminders.map((ms) => (
                    <span key={ms} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                      {formatOffset(ms)}
                      <button
                        type="button"
                        onClick={() => setReminders((prev) => prev.filter((v) => v !== ms))}
                        className="text-amber-700 hover:text-amber-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {quest.status !== QUEST_STATUS.EXPIRED ? (
                <Btn type="button" size="sm" variant="default" onClick={handleSaveDeadline} className="w-full justify-center">
                  Enregistrer la deadline
                </Btn>
              ) : (
                <Btn type="button" size="sm" variant="danger" onClick={handleReactivate} className="w-full justify-center">
                  Reactiver avec cette deadline
                </Btn>
              )}
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
            <Btn onClick={() => completeQuest(quest.id)} variant="success" className="w-full justify-center" disabled={quest.status === QUEST_STATUS.EXPIRED}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {quest.status === QUEST_STATUS.EXPIRED ? 'Deadline depassee' : 'Marquer comme faite'}
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
