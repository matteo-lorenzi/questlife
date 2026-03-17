import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import { QUEST_STATUS, CANVAS_BACKGROUNDS } from '../../utils/constants'
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
  const canvasRef = useRef(null)
  const [rfInstance, setRfInstance] = useState(null)
  const chapterQuests = quests.filter(q => q.chapterId === chapter.id)
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(chapterQuests))
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(chapterQuests))

  useEffect(() => {
    setNodes(buildNodes(chapterQuests))
    setEdges(buildEdges(chapterQuests))
  }, [chapter.id, quests, setNodes, setEdges])

  function handleDrop(e) {
    e.preventDefault()
    const type = e.dataTransfer.getData('quest_type') || e.dataTransfer.getData('application/questlife-type')
    if (!type) return
    const position = rfInstance
      ? rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      : { x: 120, y: 120 }
    createQuest(chapter.id, position, type)
  }

  const handleQuickCreate = useCallback((type) => {
    if (!canvasRef.current) {
      createQuest(chapter.id, { x: 120, y: 120 }, type)
      return
    }
    const bounds = canvasRef.current.getBoundingClientRect()
    const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
    const basePosition = rfInstance
      ? rfInstance.screenToFlowPosition(center)
      : { x: 180, y: 140 }
    const offset = chapterQuests.length % 4
    const position = {
      x: Math.round(basePosition.x - 80 + offset * 28),
      y: Math.round(basePosition.y - 40 + offset * 18),
    }
    createQuest(chapter.id, position, type)
  }, [rfInstance, createQuest, chapter.id, chapterQuests.length])

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
    globalThis.addEventListener('keydown', handleKey)
    return () => globalThis.removeEventListener('keydown', handleKey)
  }, [closePanel])

  const savedVp = canvasViewports[chapter.id]
  const defaultViewport = savedVp || { x: 60, y: 60, zoom: 1 }
  const selectedBackgroundId = chapter.canvasBackground || CANVAS_BACKGROUNDS[0].id
  const selectedBackground = CANVAS_BACKGROUNDS.find((bg) => bg.id === selectedBackgroundId) || CANVAS_BACKGROUNDS[0]
  const rfVariant = selectedBackground.canvas.rfVariant === 'lines'
    ? BackgroundVariant.Lines
    : BackgroundVariant.Dots

  return (
    <div className="flex flex-1 overflow-hidden">
      <QuestSidebar onQuickCreate={handleQuickCreate} />
      <div
        ref={canvasRef}
        className="flex-1 relative"
        style={{
          backgroundColor: selectedBackground.canvas.backgroundColor,
          backgroundImage: selectedBackground.canvas.backgroundImage,
          backgroundSize: selectedBackground.canvas.backgroundSize,
        }}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
      >
        <ReactFlow
          nodes={nodes} edges={edges}
          style={{
            backgroundColor: selectedBackground.canvas.backgroundColor,
            backgroundImage: selectedBackground.canvas.backgroundImage,
            backgroundSize: selectedBackground.canvas.backgroundSize,
          }}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={(_, node) => updateQuestPosition(node.id, node.position)}
          onPaneClick={closePanel}
          nodeTypes={NODE_TYPES}
          onInit={setRfInstance}
          defaultViewport={defaultViewport}
          onMoveEnd={(_, vp) => saveViewport(chapter.id, vp)}
          minZoom={0.2} maxZoom={2}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
        >
          <Background
            variant={rfVariant}
            gap={selectedBackground.canvas.rfGap}
            size={selectedBackground.canvas.rfSize}
            color={selectedBackground.canvas.rfColor}
          />
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
              <p className="text-xs text-gray-300 mt-1">Ou clique sur un type dans la colonne de gauche</p>
            </div>
          </div>
        )}
      </div>
      <QuestPanel />
    </div>
  )
}
