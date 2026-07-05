import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { solveFlow, type FlowResult } from '../solver/flowSolver';

// Hook that runs the flow solver on factory changes (debounced)
export function useFlowSolver(): FlowResult | null {
  const machines = useEditorStore((s) => s.machines);
  const connections = useEditorStore((s) => s.connections);
  const splitters = useEditorStore((s) => s.splitters);
  const beacons = useEditorStore((s) => s.beacons);
  const data = useEditorStore((s) => s.data);
  const [result, setResult] = useFlowResult();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!data) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const flowResult = solveFlow(machines, connections, data, splitters, beacons);
      setResult(flowResult);
    }, 200);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [machines, connections, splitters, beacons, data, setResult]);

  return result;
}

// Small state holder for the flow result
function useFlowResult(): [FlowResult | null, (r: FlowResult) => void] {
  const [result, setResult] = useState<FlowResult | null>(null);
  return [result, setResult];
}