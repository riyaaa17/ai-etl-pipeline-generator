import { useMemo } from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import "reactflow/dist/style.css";

const nodeBaseStyle = {
  padding: "10px 16px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid",
  textAlign: "center",
  minWidth: 160,
};

const styles = {
  source: {
    ...nodeBaseStyle,
    background: "rgba(6, 182, 212, 0.1)",
    borderColor: "rgba(6, 182, 212, 0.4)",
    color: "#67e8f9",
  },
  filter: {
    ...nodeBaseStyle,
    background: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
  },
  join: {
    ...nodeBaseStyle,
    background: "rgba(251, 191, 36, 0.08)",
    borderColor: "rgba(251, 191, 36, 0.3)",
    color: "#fcd34d",
  },
  transform: {
    ...nodeBaseStyle,
    background: "rgba(139, 92, 246, 0.1)",
    borderColor: "rgba(139, 92, 246, 0.35)",
    color: "#c4b5fd",
  },
  output: {
    ...nodeBaseStyle,
    background: "rgba(99, 102, 241, 0.15)",
    borderColor: "#6366f1",
    color: "#a5b4fc",
    fontWeight: 700,
  },
};

export default function PipelineFlow({ documentation, transformationPlan, kpiDefinition }) {
  const { nodes, edges } = useMemo(() => {
    const nodeList = [];
    const edgeList = [];
    let yPos = 0;
    const yStep = 90;
    let idCounter = 0;

    const addNode = (label, style) => {
      const id = `n${idCounter++}`;
      nodeList.push({
        id,
        data: { label },
        position: { x: 250, y: yPos },
        style,
        sourcePosition: "bottom",
        targetPosition: "top",
      });
      yPos += yStep;
      return id;
    };

    const connect = (a, b) => {
      edgeList.push({
        id: `e-${a}-${b}`,
        source: a,
        target: b,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
        style: { stroke: "#4b5563" },
      });
    };

    let prevId = null;

    // 1. Source table(s)
    const sources = documentation?.data_sources || [];
    sources.forEach((src) => {
      const id = addNode(src.split(".").pop(), styles.source);
      if (prevId) connect(prevId, id);
      prevId = id;
    });

    // 2. Filtering steps
    (transformationPlan?.filtering_steps || []).forEach((step) => {
      const id = addNode(step.length > 40 ? step.slice(0, 40) + "…" : step, styles.filter);
      if (prevId) connect(prevId, id);
      prevId = id;
    });

    // 3. Joins
    (transformationPlan?.joins_needed || []).forEach((join) => {
      const id = addNode(join.length > 40 ? join.slice(0, 40) + "…" : join, styles.join);
      if (prevId) connect(prevId, id);
      prevId = id;
    });

    // 4. Date transformations
    (transformationPlan?.date_transformations || []).forEach((t) => {
      const id = addNode(t, styles.transform);
      if (prevId) connect(prevId, id);
      prevId = id;
    });

    // 5. Aggregations
    (transformationPlan?.aggregations || []).forEach((agg) => {
      const id = addNode(agg, styles.transform);
      if (prevId) connect(prevId, id);
      prevId = id;
    });

    // 6. Final KPI output
    const finalLabel = kpiDefinition?.kpi_name || "KPI Output";
    const finalId = addNode(`📊 ${finalLabel}`, styles.output);
    if (prevId) connect(prevId, finalId);

    return { nodes: nodeList, edges: edgeList };
  }, [documentation, transformationPlan, kpiDefinition]);

  return (
    <div style={{ height: 420, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={true}
      >
        <Background color="#2a2e37" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}