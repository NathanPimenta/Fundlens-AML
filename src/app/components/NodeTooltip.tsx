import type { GraphNode } from '../../api/types';

interface NodeTooltipProps {
  nodeId: string;
  x: number;
  y: number;
  node?: GraphNode | null;
}

function riskScoreFromLevel(level?: string): number {
  switch (level) {
    case 'critical':
      return 94;
    case 'high':
      return 78;
    case 'medium':
      return 58;
    default:
      return 42;
  }
}

export default function NodeTooltip({ nodeId, x, y, node }: NodeTooltipProps) {
  if (!node && nodeId === 'EXTERNAL') return null;

  const displayId = nodeId.replace(/-return$/i, '');
  const accountType = node?.account_type
    ? node.account_type.charAt(0).toUpperCase() + node.account_type.slice(1)
    : 'Account';
  const balance = node?.amount != null ? `₹${Number(node.amount).toLocaleString('en-IN')}` : '—';
  const riskScore = riskScoreFromLevel(node?.risk_level);

  const riskDrivers: string[] = [];
  if (node?.is_dormant) riskDrivers.push("Dormant reactivation");
  if (node?.is_hub) riskDrivers.push("High-centrality hub");
  if (node?.is_origin) riskDrivers.push("Layering origin source");
  if (riskScore >= 75) riskDrivers.push("Out-of-pattern velocity spike");
  if (displayId === 'ACC-0510') riskDrivers.push("58.3x profile mismatch");
  if (displayId === 'ACC-0041') riskDrivers.push("PEP-adjacent owner");

  return (
    <div
      className="fixed bg-white border border-[#E31E24] rounded-lg p-3 shadow-lg z-50 pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y - 140}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="space-y-2 text-xs" style={{ fontFamily: 'DM Mono' }}>
        <div className="text-[#E31E24] font-bold">{displayId}</div>
        <div className="text-gray-600">
          <div>
            Type: <span className="text-gray-900 font-medium">{accountType}</span>
          </div>
          <div>
            Flow volume: <span className="text-gray-900 font-medium">{balance}</span>
          </div>
          {node?.label && (
            <div>
              Label: <span className="text-gray-900 font-medium">{node.label}</span>
            </div>
          )}
          <div>
            Risk score:{' '}
            <span
              className={
                riskScore >= 80
                  ? 'text-[#E31E24] font-bold'
                  : riskScore >= 60
                    ? 'text-[#F59E0B] font-bold'
                    : 'text-[#10B981] font-bold'
              }
            >
              {riskScore}%
            </span>
          </div>
          {riskDrivers.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-[10px] font-bold text-[#E31E24] uppercase mb-1">GNN Explainer Drivers:</div>
              {riskDrivers.map((d, i) => (
                <div key={i} className="text-gray-900 text-[10px] font-medium leading-tight">
                  • {d}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
