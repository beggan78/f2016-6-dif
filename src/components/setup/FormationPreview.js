import React from 'react';
import { Shield, Zap, Users, ArrowDownUp } from 'lucide-react';
import { FORMATIONS } from '../../constants/teamConfiguration';

/**
 * FormationPreview - Visual preview component for tactical formations
 * Shows position layout and role distribution for different formations
 */
export function FormationPreview({ formation, className = '' }) {
  if (!formation) return null;

  const getFormationLayout = () => {
    switch (formation) {
      case FORMATIONS.FORMATION_2_2:
        return {
          name: '2-2 Formation',
          description: 'Classic formation with balanced attack and defense',
          positions: [
            { name: 'Left Attacker', icon: Zap, x: 25, y: 20, color: 'text-red-400' },
            { name: 'Right Attacker', icon: Zap, x: 75, y: 20, color: 'text-red-400' },
            { name: 'Left Defender', icon: Shield, x: 25, y: 60, color: 'text-blue-400' },
            { name: 'Right Defender', icon: Shield, x: 75, y: 60, color: 'text-blue-400' },
            { name: 'Goalie', icon: Users, x: 50, y: 85, color: 'text-green-400' }
          ],
          roles: [
            { role: 'Defenders', count: 2, color: 'text-blue-400' },
            { role: 'Attackers', count: 2, color: 'text-red-400' }
          ]
        };
      
      case FORMATIONS.FORMATION_1_2_1:
        return {
          name: '1-2-1 Formation',
          description: 'Modern formation with midfield control',
          positions: [
            { name: 'Attacker', icon: Zap, x: 50, y: 15, color: 'text-red-400' },
            { name: 'Left Mid', icon: ArrowDownUp, x: 25, y: 40, color: 'text-yellow-400' },
            { name: 'Right Mid', icon: ArrowDownUp, x: 75, y: 40, color: 'text-yellow-400' },
            { name: 'Defender', icon: Shield, x: 50, y: 65, color: 'text-blue-400' },
            { name: 'Goalie', icon: Users, x: 50, y: 85, color: 'text-green-400' }
          ],
          roles: [
            { role: 'Defender', count: 1, color: 'text-blue-400' },
            { role: 'Midfielders', count: 2, color: 'text-yellow-400' },
            { role: 'Attacker', count: 1, color: 'text-red-400' }
          ]
        };
      
      default:
        return null;
    }
  };

  const layout = getFormationLayout();
  if (!layout) return null;

  return (
    <div className={`bg-slate-800 rounded-lg p-4 border border-slate-600 ${className}`}>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-sky-200 mb-1">{layout.name}</h4>
        <p className="text-xs text-slate-400">{layout.description}</p>
      </div>
      
      {/* Field visualization */}
      <div className="relative bg-green-900 rounded-md border border-green-700 h-32 mb-3">
        {/* Field lines */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-green-600"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-600"></div>
        
        {/* Center circle */}
        <div className="absolute left-1/2 top-1/2 w-6 h-6 border border-green-600 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        
        {/* Goal areas */}
        <div className="absolute inset-x-0 bottom-0 h-4 border-t border-green-600"></div>
        <div className="absolute inset-x-0 top-0 h-4 border-b border-green-600"></div>
        
        {/* Position markers */}
        {layout.positions.map((position, index) => {
          const Icon = position.icon;
          return (
            <div
              key={index}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <div className={`w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center ${position.color} transition-all group-hover:scale-110`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="absolute top-7 left-1/2 transform -translate-x-1/2 bg-slate-900 px-1 py-0.5 rounded text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {position.name}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Role distribution */}
      <div className="flex justify-between text-xs">
        {layout.roles.map((role, index) => (
          <div key={index} className="text-center">
            <div className={`font-medium ${role.color}`}>{role.count}</div>
            <div className="text-slate-400">{role.role}</div>
          </div>
        ))}
        <div className="text-center">
          <div className="font-medium text-green-400">1</div>
          <div className="text-slate-400">Goalie</div>
        </div>
      </div>
    </div>
  );
}