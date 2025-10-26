import { useMemo, useState } from 'react';
import { constellationSnapshot } from './data/constellation.ts';
import { useReducedMotionPreference } from './hooks/useReducedMotionPreference.ts';
import { ConstellationScene } from './components/ConstellationScene.tsx';

export type ViewMode = '3d' | '2d';
export type PerformanceMode = 'high' | 'medium' | 'low';

export type SelectedEntity =
  | { type: 'hub' }
  | { type: 'agent'; id: string }
  | { type: 'account'; id: string }
  | null;

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('high');
  const [selected, setSelected] = useState<SelectedEntity>({ type: 'hub' });
  const reducedMotionPreference = useReducedMotionPreference();
  const [reducedMotionOverride, setReducedMotionOverride] = useState(false);

  const reducedMotion = reducedMotionPreference || reducedMotionOverride;

  const panelDetails = useMemo(() => {
    if (!selected) {
      return null;
    }

    if (selected.type === 'hub') {
      return {
        title: 'Net Worth',
        subtitle: `Health Score: ${constellationSnapshot.healthScore}`,
        body: `Current net worth is $${constellationSnapshot.netWorth.toLocaleString()}.` 
      };
    }

    if (selected.type === 'agent') {
      const agent = constellationSnapshot.agents.find((item) => item.id === selected.id);
      if (!agent) {
        return null;
      }
      return {
        title: agent.label,
        subtitle: `State: ${agent.state}`,
        body: agent.description
      };
    }

    const account = constellationSnapshot.accounts.find((item) => item.id === selected.id);
    if (!account) {
      return null;
    }

    const formattedBalance = account.balance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return {
      title: account.label,
      subtitle: `Balance: $${formattedBalance}`,
      body: `Activity: ${account.activityLevel}`
    };
  }, [selected]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Constellation Control Room</h1>
          <p>Explore the enhanced 3D visualization without touching the MVP backend.</p>
        </div>
        <div className="controls">
          <label>
            View
            <select
              value={viewMode}
              onChange={(event) => setViewMode(event.target.value as ViewMode)}
            >
              <option value="3d">3D</option>
              <option value="2d">2D (Accessibility)</option>
            </select>
          </label>
          <label>
            Performance
            <select
              value={performanceMode}
              onChange={(event) => setPerformanceMode(event.target.value as PerformanceMode)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={reducedMotionOverride}
              onChange={(event) => setReducedMotionOverride(event.target.checked)}
            />
            Reduced motion
          </label>
        </div>
      </header>

      <main className="main-content">
        <ConstellationScene
          snapshot={constellationSnapshot}
          viewMode={viewMode}
          performanceMode={performanceMode}
          reducedMotion={reducedMotion}
          selected={selected}
          onSelect={setSelected}
        />
        {panelDetails && (
          <aside className="detail-panel">
            <h2>{panelDetails.title}</h2>
            <p className="subtitle">{panelDetails.subtitle}</p>
            <p>{panelDetails.body}</p>
          </aside>
        )}
      </main>
    </div>
  );
}

export default App;
