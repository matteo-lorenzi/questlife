import React, { useCallback, useEffect } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useStore } from '../../store/useStore'
import QuestNode from '../quest/QuestNode'
import QuestSidebar from '../quest/QuestSidebar'
import QuestPanel from '../editor/QuestPanel'
import { QUEST_STATUS } from '../../utils/constants'
import { wouldCreateCycle } from '../../utils/graph'
import toast from 'react-hot-toast'

const NODE_TYPES = { quest: QuestNode }

function buildNodes(quests) {
  return quests.map(q => ({
    id: q.id, type: 'quest',
    position: q.position,
    data: { quest: q },
    // Done quests remain movable to reorganize the graph visually.
    draggable: true,
  }))
}

function buildEdges(quests) {
  const edges = []
  for (const q of quests) {
    for (const depId of q.dependencies) {
      const src = quests.find(x => x.id === depId)
      edges.push({
        id: `${depId}->${q.id}`, source: depId, target: q.id,
        animated: src?.status === QUEST_STATUS.DONE,
        style: {
          stroke: q.status === QUEST_STATUS.LOCKED ? '#D3D1C7' : '#1D9E75',
          strokeDasharray: q.status === QUEST_STATUS.LOCKED ? '5 4' : undefined,
          strokeWidth: 1.8,
        },
      })
    }
  }
  return edges
}

export default function CanvasView({ chapter }) {
  const { quests, createQuest, updateQuestPosition, addDependency, saveViewport, canvasViewports, closePanel } = useStore()
  const chapterQuests = quests.filter(q => q.chapterId === chapter.id)
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(chapterQuests))
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(chapterQuests))

  useEffect(() => {
    setNodes(buildNodes(chapterQuests))
    setEdges(buildEdges(chapterQuests))
  }, [chapter.id, quests, setNodes, setEdges])

  function handleDrop(e) {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/questlife-type')
    if (!type) return
    const bounds = e.currentTarget.getBoundingClientRect()
    const position = { x: Math.round(e.clientX - bounds.left - 80), y: Math.round(e.clientY - bounds.top - 30) }
    createQuest(chapter.id, position, type)
  }

  const onConnect = useCallback((params) => {
    const { source, target } = params
    if (source === target) return
    if (wouldCreateCycle(chapterQuests, source, target)) {
      toast.error('Ce lien créerait une boucle de dépendance.')
      return
    }
    addDependency(target, source)
  }, [chapterQuests, addDependency])

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') closePanel() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closePanel])

  const savedVp = canvasViewports[chapter.id]
  const defaultViewport = savedVp || { x: 60, y: 60, zoom: 1 }

  return (
    <div className="flex flex-1 overflow-hidden">
      <QuestSidebar />
      <div className="flex-1 relative" onDrop={handleDrop} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={(_, node) => updateQuestPosition(node.id, node.position)}
          onPaneClick={closePanel}
          nodeTypes={NODE_TYPES}
          defaultViewport={defaultViewport}
          onMoveEnd={(_, vp) => saveViewport(chapter.id, vp)}
          minZoom={0.2} maxZoom={2}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#D3D1C7" />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap position="bottom-left"
            nodeColor={n => { const q = chapterQuests.find(x => x.id === n.id); return !q ? '#D3D1C7' : q.status === 'done' ? '#1D9E75' : q.status === 'active' ? '#EF9F27' : '#D3D1C7' }}
            maskColor="rgba(248,248,246,0.6)"
            style={{ background: 'white', borderRadius: 8, border: '1px solid #E5E5E0' }} />
        </ReactFlow>
        {chapterQuests.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><line x1="10" y1="3" x2="10" y2="17" stroke="#D3D1C7" strokeWidth="1.5" strokeLinecap="round" /><line x1="3" y1="10" x2="17" y2="10" stroke="#D3D1C7" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <p className="text-sm text-gray-300">Glisse une quête depuis la sidebar pour commencer</p>
            </div>
          </div>
        )}
      </div>
      <QuestPanel />
    </div>
  )
}
