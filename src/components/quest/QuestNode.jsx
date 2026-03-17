import React, { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { useStore } from '../../store/useStore'
import { QUEST_STATUS, QUEST_TYPE } from '../../utils/constants'

const STATUS_STYLE = {
  draft: { border: '#B4B2A9', bg: '#FAFAF8', text: '#888780' },
  locked: { border: '#B4B2A9', bg: '#F5F5F2', text: '#888780' },
  active: { border: '#EF9F27', bg: '#FFFDF7', text: '#412402' },
  done: { border: '#1D9E75', bg: '#F0FBF6', text: '#085041' },
}

const TYPE_BADGE = {
  standard: null,
  habit: { label: 'Habitude', color: '#378ADD', bg: '#E6F1FB' },
  boss: { label: 'Objectif final', color: '#BA7517', bg: '#FAEEDA' },
}

function QuestNode({ id, data, selected }) {
  const { selectQuest, selectedQuestId, completeQuest } = useStore()
  const { quest } = data
  if (!quest) return null

  const st = STATUS_STYLE[quest.status] || STATUS_STYLE.locked
  const badge = TYPE_BADGE[quest.type]
  const isSelected = selected || selectedQuestId === id

  return (
    <div
      className={`quest-node quest-node-${quest.status} relative`}
      onClick={() => selectQuest(id)}
    >
      <Handle type="target" position={Position.Left}
        style={{ left: -5, top: '50%', transform: 'translateY(-50%)' }} />

      <div
        className="quest-node-body rounded-xl transition-all duration-200 cursor-pointer select-none"
        style={{
          background: st.bg,
          border: `${quest.type === QUEST_TYPE.BOSS ? '2px' : '1.5px'} ${quest.status === QUEST_STATUS.DRAFT || quest.status === QUEST_STATUS.LOCKED ? 'dashed' : 'solid'} ${isSelected ? '#7F77DD' : st.border}`,
          width: 160,
          padding: '10px 12px',
          boxShadow: isSelected ? '0 0 0 3px rgba(127,119,221,0.2)' : 'none',
          opacity: quest.status === QUEST_STATUS.LOCKED ? 0.7 : 1,
        }}
      >
        {/* Status icon */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-xs font-medium leading-tight" style={{ color: st.text, maxWidth: 120 }}>
            {quest.title || <span style={{ color: '#B4B2A9', fontStyle: 'italic' }}>Sans titre…</span>}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            {quest.status !== QUEST_STATUS.DONE && quest.status !== QUEST_STATUS.DRAFT && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  completeQuest(quest.id)
                }}
                className="w-5 h-5 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors flex items-center justify-center"
                title="Valider rapidement"
              >
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {quest.status === QUEST_STATUS.DONE && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5.5" fill="#1D9E75" />
                <path d="M3 6L5 8L9 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {quest.status === QUEST_STATUS.LOCKED && (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                <rect x="1" y="5" width="8" height="6" rx="1.5" stroke="#B4B2A9" strokeWidth="1.2" fill="none" />
                <path d="M3 5V3.5C3 2.1 7 2.1 7 3.5V5" stroke="#B4B2A9" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </svg>
            )}
          </div>
        </div>

        {/* Type badge */}
        {badge && (
          <span className="inline-block text-xs px-1.5 py-0.5 rounded mb-1.5"
            style={{ fontSize: 9, background: badge.bg, color: badge.color, fontWeight: 500 }}>
            {badge.label}
          </span>
        )}

        {/* XP */}
        <div className="flex items-center gap-1 mt-1">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <polygon points="4,0.5 5,3 7.5,3.2 5.5,5 6.2,7.5 4,6.2 1.8,7.5 2.5,5 0.5,3.2 3,3" fill={st.text} opacity="0.6" />
          </svg>
          <span style={{ fontSize: 9, color: st.text, opacity: 0.7 }}>
            {quest.status === QUEST_STATUS.DONE ? `+${quest.xp} XP` : `${quest.xp} XP`}
          </span>
          {(quest.attachments || []).length > 0 && (
            <span style={{ fontSize: 9, color: st.text, opacity: 0.65 }}>
              • {(quest.attachments || []).length} fichier{(quest.attachments || []).length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right}
        style={{ right: -5, top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  )
}

export default memo(QuestNode)
