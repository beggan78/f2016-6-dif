import React from 'react';
import { Shield, Sword, Hand, ArrowDownUp } from 'lucide-react';
import { FORMATIONS } from '../../constants/teamConfiguration';
import fieldImage from '../../assets/images/full-field-perspective-small.png';

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
          description: '2 defenders, 2 attackers',
          positions: [
            { name: 'Left Attacker', icon: Sword, x: 38, y: 25, color: 'text-blue-400' },
            { name: 'Right Attacker', icon: Sword, x: 62, y: 25, color: 'text-blue-400' },
            { name: 'Left Defender', icon: Shield, x: 35, y: 55, color: 'text-blue-400' },
            { name: 'Right Defender', icon: Shield, x: 65, y: 55, color: 'text-blue-400' },
            { name: 'Goalie', icon: Hand, x: 50, y: 88, color: 'text-blue-400' }
          ],
          roles: [
            { role: 'Defenders', count: 2, color: 'text-blue-400' },
            { role: 'Attackers', count: 2, color: 'text-red-400' }
          ]
        };
      
      case FORMATIONS.FORMATION_1_2_1:
        return {
          name: '1-2-1 Formation',
          description: '1 defender, 2 midfielders, 1 attacker',
          positions: [
            { name: 'Attacker', icon: Sword, x: 50, y: 20, color: 'text-blue-400' },
            { name: 'Left Mid', icon: ArrowDownUp, x: 30, y: 45, color: 'text-blue-400' },
            { name: 'Right Mid', icon: ArrowDownUp, x: 70, y: 45, color: 'text-blue-400' },
            { name: 'Defender', icon: Shield, x: 50, y: 65, color: 'text-blue-400' },
            { name: 'Goalie', icon: Hand, x: 50, y: 88, color: 'text-blue-400' }
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
      <div 
        className="relative rounded-md border border-green-700 h-48 mb-3 bg-cover bg-center"
        style={{ backgroundImage: `url(${fieldImage})` }}
      >
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
        {/* Role counts removed as requested */}
      </div>
    </div>
  );
}