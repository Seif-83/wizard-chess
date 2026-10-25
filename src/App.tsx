import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';

interface GraphicsSettings {
  preset: 'lite' | 'high' | 'custom';
  flames: boolean;
  shadows: boolean;
  pixelRatio: number;
  animations: 'lite' | 'cinematic';
  idleAnimations: boolean;
  envMap: boolean;
  windowLights: boolean;
}

const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  preset: 'lite',
  flames: false,
  shadows: false,
  pixelRatio: 1.0,
  animations: 'lite',
  idleAnimations: false,
  envMap: false,
  windowLights: false
};

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>(() => {
    try {
      const saved = localStorage.getItem('wizard_chess_graphics_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isHigh = parsed.preset === 'high';
        return {
          preset: parsed.preset || (parsed.shadows ? 'high' : 'lite'),
          flames: parsed.flames !== undefined ? Boolean(parsed.flames) : isHigh,
          shadows: Boolean(parsed.shadows),
          pixelRatio: parsed.pixelRatio === 2 ? 2.0 : 1.0,
          animations: parsed.animations === 'cinematic' ? 'cinematic' : 'lite',
          idleAnimations: Boolean(parsed.idleAnimations),
          envMap: parsed.envMap !== undefined ? Boolean(parsed.envMap) : isHigh,
          windowLights: parsed.windowLights !== undefined ? Boolean(parsed.windowLights) : isHigh
        };
      }
    } catch (e) {}
    return { ...DEFAULT_GRAPHICS_SETTINGS };
  });

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else {
          setMobileSheetOpen(false);
        }
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    const handleGraphicsEvent = (e: Event) => {
      const customEvt = e as CustomEvent<GraphicsSettings>;
      if (customEvt.detail) {
        setGraphicsSettings(customEvt.detail);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('wizard-chess-graphics-changed', handleGraphicsEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wizard-chess-graphics-changed', handleGraphicsEvent);
    };
  }, [settingsOpen]);

  const handleApplyPreset = (preset: 'lite' | 'high') => {
    const next: GraphicsSettings =
      preset === 'high'
        ? {
            preset: 'high',
            flames: true,
            shadows: true,
            pixelRatio: 2.0,
            animations: 'cinematic',
            idleAnimations: true,
            envMap: true,
            windowLights: true
          }
        : {
            preset: 'lite',
            flames: false,
            shadows: false,
            pixelRatio: 1.0,
            animations: 'lite',
            idleAnimations: false,
            envMap: false,
            windowLights: false
          };

    setGraphicsSettings(next);
    const win = window as unknown as {
      wizardChess?: { setGraphicsQuality?: (s: GraphicsSettings) => void };
    };
    if (win.wizardChess?.setGraphicsQuality) {
      win.wizardChess.setGraphicsQuality(next);
    }
  };

  const handleUpdateOption = (partial: Partial<GraphicsSettings>) => {
    setGraphicsSettings((prev) => {
      const merged: GraphicsSettings = { ...prev, ...partial };
      // Check if it strictly matches one of the presets
      const isFullHigh =
        merged.flames &&
        merged.shadows &&
        merged.pixelRatio === 2 &&
        merged.animations === 'cinematic' &&
        merged.idleAnimations &&
        merged.envMap &&
        merged.windowLights;
      const isFullLite =
        !merged.flames &&
        !merged.shadows &&
        merged.pixelRatio === 1 &&
        merged.animations === 'lite' &&
        !merged.idleAnimations &&
        !merged.envMap &&
        !merged.windowLights;

      merged.preset = isFullHigh ? 'high' : isFullLite ? 'lite' : 'custom';

      const win = window as unknown as {
        wizardChess?: { setGraphicsQuality?: (s: GraphicsSettings) => void };
      };
      if (win.wizardChess?.setGraphicsQuality) {
        win.wizardChess.setGraphicsQuality(merged);
      }
      return merged;
    });
  };

  const handleRestoreUI = () => {
    const win = window as unknown as { wizardChess?: { toggleUI?: (force?: boolean) => void } };
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Hide UI [H]';
    }
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Summoning Sanctum Architecture &amp; Sculpted Pieces...</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Show HUD Controls"
      >
        Show UI
      </button>

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Wizard Chess</span>
          </div>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">White to Move</span>
            <span className="mode-badge" id="mode-badge">Playing as White</span>
          </div>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Close' : 'Controls'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Controls</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Controls"
            >
              Close ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Game Actions</div>

          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Play as Black
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Let the AI make the next move immediately"
            onClick={() => setMobileSheetOpen(false)}
          >
            AI Move
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Start a fresh game on the altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            New Game
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Camera Views</span>
            <span className="mobile-sheet-section-sub">Tap active view to flip</span>
          </div>

          <button
            className="hud-btn"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn active"
            id="btn-cam-top"
            title="Overhead Board View (Click again to flip White / Black orientation)"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View (Click again to switch East / West side)"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View (Click again to switch North Rose / South Narthex)"
          >
            Cathedral
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Settings &amp; Performance</div>

          <button
            type="button"
            className="hud-btn hud-settings-btn"
            id="btn-settings-open"
            title="Graphics Quality & Performance Settings"
            onClick={() => {
              setMobileSheetOpen(false);
              setSettingsOpen(true);
            }}
          >
            <span className="settings-btn-icon">⚙️</span>
            <span>Settings</span>
            <span className="settings-mode-pill">
              {graphicsSettings.preset === 'high' ? '🔮 High' : '⚡ Lite'}
            </span>
          </button>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Toggle HUD visibility (Shortcut: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Touch:</strong> Tap Piece to Move &nbsp;•&nbsp; 1-Finger Drag: Orbit &nbsp;•&nbsp; 2-Finger Drag: Pan &nbsp;•&nbsp; Pinch: Zoom
          </div>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Controls:</strong> Click Piece to Move &nbsp;•&nbsp; Left-Drag: Orbit &nbsp;•&nbsp; Right-Drag: Pan &nbsp;•&nbsp; Scroll: Zoom &nbsp;•&nbsp; WASD + R/F: Fly Cam &nbsp;•&nbsp; H: Hide UI
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      {settingsOpen && (
        <div
          className="settings-modal-backdrop"
          id="settings-modal-backdrop"
          onClick={() => setSettingsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
        >
          <div
            className="settings-modal-card"
            id="settings-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-modal-header">
              <div>
                <div className="settings-modal-title" id="settings-modal-title">
                  Sanctum Settings
                </div>
                <div className="settings-modal-subtitle">
                  Graphics Quality &amp; Mobile Performance
                </div>
              </div>
              <button
                type="button"
                className="settings-modal-close"
                id="btn-settings-close"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close Settings"
              >
                ✕
              </button>
            </div>

            <div className="settings-section-title">Graphics Preset</div>

            <div className="settings-presets-grid">
              <button
                type="button"
                className={`settings-preset-card ${graphicsSettings.preset === 'lite' ? 'selected' : ''}`}
                id="btn-preset-lite"
                onClick={() => handleApplyPreset('lite')}
              >
                <div className="preset-card-top">
                  <span className="preset-badge recommended">Default • Smooth</span>
                  <span className="preset-icon">⚡</span>
                </div>
                <div className="preset-name">Lite (Fast &amp; Smooth)</div>
                <div className="preset-desc">
                  Optimized for smooth 60 FPS on all phones. Snappy piece movements, side fires removed, 1x resolution, and disabled shadows to save battery and keep devices cool.
                </div>
              </button>

              <button
                type="button"
                className={`settings-preset-card ${graphicsSettings.preset === 'high' ? 'selected' : ''}`}
                id="btn-preset-high"
                onClick={() => handleApplyPreset('high')}
              >
                <div className="preset-card-top">
                  <span className="preset-badge desktop">High Fidelity</span>
                  <span className="preset-icon">🔮</span>
                </div>
                <div className="preset-name">High (Original Cinematic)</div>
                <div className="preset-desc">
                  The full visual experience. Twin brazier volumetric flames, real-time soft shadows, high-DPI retina resolution, stone shatter physics, and dramatic camera flybys.
                </div>
              </button>
            </div>

            <div className="settings-section-title">Fine-Tune Options</div>

            <div className="settings-toggles-list">
              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <div className="toggle-title">Side Fire &amp; Braziers</div>
                  <div className="toggle-desc">
                    {graphicsSettings.flames
                      ? 'Twin volumetric flame shaders and warm firelight active'
                      : 'Removed (Eliminates flame shaders & prevents phone heating)'}
                  </div>
                </div>
                <div className="toggle-pill-group">
                  <button
                    type="button"
                    className={`toggle-pill-btn ${!graphicsSettings.flames ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ flames: false })}
                  >
                    Off (Lite)
                  </button>
                  <button
                    type="button"
                    className={`toggle-pill-btn ${graphicsSettings.flames ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ flames: true })}
                  >
                    On (Fire)
                  </button>
                </div>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <div className="toggle-title">Piece Movement Animations</div>
                  <div className="toggle-desc">
                    {graphicsSettings.animations === 'lite'
                      ? 'Snappy & Fast (Stationary Camera, 0.25s glide)'
                      : 'Cinematic Wizard Duel (Dynamic 3/4 camera arc & debris)'}
                  </div>
                </div>
                <div className="toggle-pill-group">
                  <button
                    type="button"
                    className={`toggle-pill-btn ${graphicsSettings.animations === 'lite' ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ animations: 'lite' })}
                  >
                    ⚡ Snappy
                  </button>
                  <button
                    type="button"
                    className={`toggle-pill-btn ${graphicsSettings.animations === 'cinematic' ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ animations: 'cinematic' })}
                  >
                    🎬 Cinematic
                  </button>
                </div>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <div className="toggle-title">Real-Time Dynamic Shadows</div>
                  <div className="toggle-desc">
                    {graphicsSettings.shadows
                      ? 'Soft directional PCF shadows active on board and pieces'
                      : 'Disabled for highest mobile GPU framerate'}
                  </div>
                </div>
                <div className="toggle-pill-group">
                  <button
                    type="button"
                    className={`toggle-pill-btn ${!graphicsSettings.shadows ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ shadows: false })}
                  >
                    Off (Fast)
                  </button>
                  <button
                    type="button"
                    className={`toggle-pill-btn ${graphicsSettings.shadows ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ shadows: true })}
                  >
                    On (Soft)
                  </button>
                </div>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <div className="toggle-title">Display Resolution (DPI)</div>
                  <div className="toggle-desc">
                    {graphicsSettings.pixelRatio === 1
                      ? 'Standard 1x (Recommended for phones & battery life)'
                      : 'High-DPI Retina 2x (Ultra crisp on modern displays)'}
                  </div>
                </div>
                <div className="toggle-pill-group">
                  <button
                    type="button"
                    className={`toggle-pill-btn ${graphicsSettings.pixelRatio === 1 ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ pixelRatio: 1.0 })}
                  >
                    1x Standard
                  </button>
                  <button
                    type="button"
                    className={`toggle-pill-btn ${graphicsSettings.pixelRatio === 2 ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ pixelRatio: 2.0 })}
                  >
                    2x Crisp
                  </button>
                </div>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <div className="toggle-title">Cathedral Reflections &amp; Window Lights</div>
                  <div className="toggle-desc">
                    {graphicsSettings.envMap
                      ? 'Full PMREM reflections and 6 window lights active'
                      : 'Disabled (Bypasses cubemap lookups for super smooth play)'}
                  </div>
                </div>
                <div className="toggle-pill-group">
                  <button
                    type="button"
                    className={`toggle-pill-btn ${!graphicsSettings.envMap ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ envMap: false, windowLights: false })}
                  >
                    Off (Smooth)
                  </button>
                  <button
                    type="button"
                    className={`toggle-pill-btn ${graphicsSettings.envMap ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ envMap: true, windowLights: true })}
                  >
                    On (PBR)
                  </button>
                </div>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <div className="toggle-title">Stationary Piece Idle Animations</div>
                  <div className="toggle-desc">
                    {graphicsSettings.idleAnimations
                      ? 'Continuous skeletal breathing animations on all 32 pieces'
                      : 'Paused when stationary (Saves CPU & prevents phone warming)'}
                  </div>
                </div>
                <div className="toggle-pill-group">
                  <button
                    type="button"
                    className={`toggle-pill-btn ${!graphicsSettings.idleAnimations ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ idleAnimations: false })}
                  >
                    Power Saver
                  </button>
                  <button
                    type="button"
                    className={`toggle-pill-btn ${graphicsSettings.idleAnimations ? 'active' : ''}`}
                    onClick={() => handleUpdateOption({ idleAnimations: true })}
                  >
                    Active
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button
                type="button"
                className="hud-btn settings-reset-btn"
                id="btn-restore-defaults"
                onClick={() => handleApplyPreset('lite')}
              >
                Restore Lite Default
              </button>
              <button
                type="button"
                className="hud-btn settings-done-btn"
                id="btn-settings-done"
                onClick={() => setSettingsOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Sanctum Judgment &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Checkmate</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            White Triumphs • The Black King Has Fallen
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Replay King Fall
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              New Game
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
