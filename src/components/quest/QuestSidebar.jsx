import React from 'react'
import { QUEST_TYPE } from '../../utils/constants'

const TYPES = [
  {
    type: QUEST_TYPE.STANDARD,
    label: 'Quête standard',
    desc: 'Objectif ponctuel',
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polygon points="8,2 14,8 8,14 2,8" stroke="#7F77DD" strokeWidth="1.4" strokeLinejoin="round" fill="#EEEDFE" /></svg>),
    border: '#AFA9EC', bg: '#EEEDFE', accent: '#534AB7',
  },
  {
    type: QUEST_TYPE.HABIT,
    label: 'Étape répétée',
    desc: 'Habitude / récurrent',
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2C4.7 2 2 4.7 2 8C2 11.3 4.7 14 8 14C11.3 14 14 11.3 14 8" stroke="#378ADD" strokeWidth="1.4" strokeLinecap="round" /><path d="M11 2L14 5L11 8" stroke="#378ADD" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>),
    border: '#B5D4F4', bg: '#E6F1FB', accent: '#185FA5',
  },
  {
    type: QUEST_TYPE.BOSS,
    label: 'Objectif final',
    desc: 'Boss du chapitre',
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polygon points="8,1.5 10,6 14.5,6.5 11.2,9.5 12.2,14 8,11.8 3.8,14 4.8,9.5 1.5,6.5 6,6" stroke="#BA7517" strokeWidth="1.3" strokeLinejoin="round" fill="#FAEEDA" /></svg>),
    border: '#FAC775', bg: '#FAEEDA', accent: '#854F0B',
  },
]

export default function QuestSidebar({ onQuickCreate }) {
  function handleDragStart(e, type) {
    e.dataTransfer.setData('quest_type', type)
    e.dataTransfer.setData('application/questlife-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="w-44 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
      <div className="px-3 py-3 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Ajouter</p>
      </div>
      <div className="p-2 space-y-1.5 flex-1">
        {TYPES.map(t => (
          <button key={t.type} type="button" draggable onDragStart={e => handleDragStart(e, t.type)}
            onClick={() => onQuickCreate?.(t.type)}
            className="w-full text-left flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-sm select-none group"
            style={{ borderColor: t.border, background: t.bg }}>
            <div className="flex-shrink-0">{t.icon}</div>
            <div>
              <p className="text-xs font-medium leading-tight" style={{ color: t.accent }}>{t.label}</p>
              <p className="text-xs leading-tight mt-0.5" style={{ color: t.accent, opacity: 0.6 }}>{t.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="px-3 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-300 leading-relaxed">Clique pour ajouter au centre, ou glisse sur le canvas.</p>
      </div>
    </div>
  )
}
