import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Activity } from 'lucide-react';

const ProcessTree = ({ treeData, selectedMetrics, toggleMetric }) => {
  const [expandedNodes, setExpandedNodes] = useState({
    'CALDERA': true, // Por defecto abrimos la primera para el ejemplo
  });

  const toggleNode = (path) => {
    setExpandedNodes(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Renderizado recursivo de carpetas y métricas
  const renderTree = (nodes, currentPath = '') => {
    return Object.entries(nodes).map(([key, value]) => {
      if (key === "_metrics" || key === "_isNode") return null;

      const fullPath = currentPath ? `${currentPath}/${key}` : key;
      const isOpen = expandedNodes[fullPath];
      const hasSubNodes = Object.keys(value).length > 2; // _isNode y _metrics siempre están
      const hasMetrics = value._metrics && value._metrics.length > 0;

      return (
        <div key={fullPath} className="mb-2">
          {/* FOLDER / NODE */}
          <div
            onClick={() => toggleNode(fullPath)}
            className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${isOpen ? 'bg-brand-secondary' : 'hover:bg-brand-secondary/50'
              }`}
          >
            {isOpen ?
              <ChevronDown size={16} className="text-brand-accent" /> :
              <ChevronRight size={16} className="text-brand-textSecondary" />
            }
            <span className={`text-[11px] font-black uppercase tracking-widest ${isOpen ? 'text-brand-textPrimary' : 'text-brand-textSecondary'
              }`}>
              {key}
            </span>
          </div>

          {/* CHILDREN (Lineas guía verticales) */}
          {isOpen && (
            <div className="ml-4 mt-2 border-l border-brand-border/50 pl-4 space-y-2">
              {/* Sub-nodos recursivos */}
              {renderTree(value, fullPath)}

              {/* Métricas (Tags finales) */}
              {hasMetrics && value._metrics.map((metric) => {
                const isActive = selectedMetrics.includes(metric.key);
                return (
                  <button
                    key={metric.key}
                    onClick={() => toggleMetric(metric.key)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${isActive
                        ? 'bg-brand-secondary border-brand-accent shadow-[0_0_15px_rgba(0,0,0,0.1)]'
                        : 'bg-transparent border-brand-border text-brand-textSecondary hover:border-brand-textPrimary'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: isActive ? metric.color : 'var(--text-secondary)' }}
                      />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-brand-textPrimary' : ''
                        }`}>
                        {metric.label}
                      </span>
                    </div>
                    {isActive && (
                      <div className="w-3 h-3 rounded-sm border border-brand-accent flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-brand-accent" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-brand-primary border-r border-brand-border w-80 p-6 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 mb-8 border-b border-brand-border pb-4">
        <Layers size={18} className="text-brand-accent" />
        <h2 className="text-[12px] font-black text-brand-textPrimary uppercase tracking-[0.2em]">
          Estructura Industrial
        </h2>
      </div>

      <div className="space-y-2">
        {renderTree(treeData)}
      </div>
    </div>
  );
};

export default ProcessTree;