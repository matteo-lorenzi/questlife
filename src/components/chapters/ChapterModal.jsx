import React, { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { Modal, Btn, Input, Textarea } from '../ui'
import ChapterIcon from '../../assets/icons/ChapterIcon'
import { CHAPTER_COLORS, CHAPTER_ICONS } from '../../utils/constants'

const ICONS = Object.keys(CHAPTER_ICONS)

export default function ChapterModal() {
  const { showChapterModal, editingChapter, closeChapterModal, createChapter, updateChapter, setActiveChapter } = useStore()

  const [name, setName]       = useState('')
  const [desc, setDesc]       = useState('')
  const [color, setColor]     = useState(CHAPTER_COLORS[0])
  const [icon, setIcon]       = useState('health')
  const [nameErr, setNameErr] = useState('')

  const isEdit = !!editingChapter?.id

  useEffect(() => {
    if (!showChapterModal) return
    if (editingChapter) {
      setName(editingChapter.title || '')
      setDesc(editingChapter.description || '')
      const c = CHAPTER_COLORS.find(c => c.accent === editingChapter.color?.accent) || CHAPTER_COLORS[0]
      setColor(c)
      setIcon(editingChapter.icon || 'health')
    } else {
      setName(''); setDesc(''); setColor(CHAPTER_COLORS[0]); setIcon('health')
    }
    setNameErr('')
  }, [showChapterModal, editingChapter])

  function handleSubmit() {
    if (!name.trim()) { setNameErr('Un nom est requis'); return }
    const data = { title: name.trim(), description: desc.trim(), color: { bg: color.bg, accent: color.accent }, icon }
    if (isEdit) {
      updateChapter(editingChapter.id, data)
      closeChapterModal()
    } else {
      const id = createChapter(data)
      closeChapterModal()
      setActiveChapter(id)
    }
  }

  return (
    <Modal open={showChapterModal} onClose={closeChapterModal}
      title={isEdit ? 'Modifier le chapitre' : 'Nouveau chapitre'}>
      <div className="px-5 py-4 space-y-4">

        {/* Preview + name */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200"
               style={{ background: color.bg }}>
            <ChapterIcon icon={icon} accent={color.accent} size={24} />
          </div>
          <Input label="Nom du chapitre" value={name} onChange={e => { setName(e.target.value); setNameErr('') }}
            placeholder="Ex : Santé & Sport" error={nameErr} className="flex-1" autoFocus />
        </div>

        {/* Description */}
        <Textarea label="Description (optionnel)" value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Décrivez vos objectifs pour ce chapitre…" rows={2} />

        {/* Color picker */}
        <div>
          <p className="text-xs text-gray-400 font-medium mb-2">Couleur</p>
          <div className="flex gap-2 flex-wrap">
            {CHAPTER_COLORS.map(c => (
              <button key={c.id} onClick={() => setColor(c)}
                className="w-7 h-7 rounded-lg transition-all duration-150 flex-shrink-0"
                style={{
                  background: c.accent,
                  outline: color.id === c.id ? `2.5px solid ${c.accent}` : 'none',
                  outlineOffset: '2px',
                  transform: color.id === c.id ? 'scale(1.15)' : 'scale(1)',
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <p className="text-xs text-gray-400 font-medium mb-2">Icône</p>
          <div className="grid grid-cols-8 gap-1.5">
            {ICONS.map(key => (
              <button key={key} onClick={() => setIcon(key)}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 border"
                style={{
                  background: icon === key ? color.bg : '#F8F8F6',
                  borderColor: icon === key ? color.accent : '#E5E5E0',
                  borderWidth: icon === key ? '1.5px' : '1px',
                }}
                title={CHAPTER_ICONS[key]?.label || key}>
                <ChapterIcon icon={key} accent={icon === key ? color.accent : '#B4B2A9'} size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-5 pb-5">
        <Btn onClick={closeChapterModal} variant="default">Annuler</Btn>
        <Btn onClick={handleSubmit} variant="primary"
          style={{ background: color.accent, borderColor: 'transparent' }}>
          {isEdit ? 'Enregistrer' : 'Créer le chapitre'}
        </Btn>
      </div>
    </Modal>
  )
}
