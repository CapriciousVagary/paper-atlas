export function FigurePreview({ type }: { type: "ring" | "modulator" | "laser" }) {
  if (type === "ring") {
    return (
      <div className="figure-art ring-art" aria-label="微环阵列示意图">
        <div className="bus-line" />
        {[0, 1, 2, 3].map((n) => <span className={`ring-node ring-${n}`} key={n} />)}
        <div className="signal signal-a" /><div className="signal signal-b" /><div className="signal signal-c" />
        <span className="axis-label axis-in">WDM IN</span><span className="axis-label axis-out">Σ OUT</span>
      </div>
    );
  }

  if (type === "modulator") {
    return (
      <div className="figure-art modulator-art" aria-label="行波调制器示意图">
        <div className="electrode electrode-top" /><div className="electrode electrode-bottom" />
        <div className="waveguide" /><div className="wave-pulse" />
        <span className="axis-label axis-in">RF + OPTICAL</span><span className="axis-label axis-out">MODULATED</span>
      </div>
    );
  }

  return (
    <div className="figure-art laser-art" aria-label="外腔激光器示意图">
      <div className="gain-chip">GAIN</div><div className="laser-path" /><div className="filter-chip">HIGH-Q<br />FILTER</div>
      <div className="laser-beam" /><span className="axis-label axis-out">λ OUT</span>
    </div>
  );
}
