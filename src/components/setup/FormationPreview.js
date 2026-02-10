import React from 'react';
import { Shield, Sword, Hand, ArrowDownUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FORMATIONS } from '../../constants/teamConfiguration';
import { Card } from '../shared/Card';
import fieldImage from '../../assets/images/full-field-perspective.png';

/**
 * FormationPreview - Visual preview component for tactical formations
 * Shows position layout and role distribution for different formations
 */
export function FormationPreview({ formation, className = '' }) {
  const { t } = useTranslation('configuration');
  if (!formation) return null;

  const getFormationLayout = () => {
    switch (formation) {
      case FORMATIONS.FORMATION_2_2:
        return {
          name: t('formationPreview.formations.2-2.name'),
          description: t('formationPreview.formations.2-2.description'),
          positions: [
            { name: t('formationPreview.positions.leftAttacker'), icon: Sword, x: 38, y: 25, color: 'text-blue-400' },
            { name: t('formationPreview.positions.rightAttacker'), icon: Sword, x: 62, y: 25, color: 'text-blue-400' },
            { name: t('formationPreview.positions.leftDefender'), icon: Shield, x: 35, y: 55, color: 'text-blue-400' },
            { name: t('formationPreview.positions.rightDefender'), icon: Shield, x: 65, y: 55, color: 'text-blue-400' },
            { name: t('formationPreview.positions.goalie'), icon: Hand, x: 50, y: 88, color: 'text-blue-400' }
          ],
          roles: [
            { role: t('formationPreview.roles.defenders'), count: 2, color: 'text-blue-400' },
            { role: t('formationPreview.roles.attackers'), count: 2, color: 'text-red-400' }
          ]
        };
      
      case FORMATIONS.FORMATION_1_2_1:
        return {
          name: t('formationPreview.formations.1-2-1.name'),
          description: t('formationPreview.formations.1-2-1.description'),
          positions: [
            { name: t('formationPreview.positions.attacker'), icon: Sword, x: 50, y: 20, color: 'text-blue-400' },
            { name: t('formationPreview.positions.leftMid'), icon: ArrowDownUp, x: 30, y: 45, color: 'text-blue-400' },
            { name: t('formationPreview.positions.rightMid'), icon: ArrowDownUp, x: 70, y: 45, color: 'text-blue-400' },
            { name: t('formationPreview.positions.defender'), icon: Shield, x: 50, y: 65, color: 'text-blue-400' },
            { name: t('formationPreview.positions.goalie'), icon: Hand, x: 50, y: 88, color: 'text-blue-400' }
          ],
          roles: [
            { role: t('formationPreview.roles.defender'), count: 1, color: 'text-blue-400' },
            { role: t('formationPreview.roles.midfielders'), count: 2, color: 'text-yellow-400' },
            { role: t('formationPreview.roles.attacker'), count: 1, color: 'text-red-400' }
          ]
        };

      case FORMATIONS.FORMATION_2_2_2:
        return {
          name: t('formationPreview.formations.2-2-2.name'),
          description: t('formationPreview.formations.2-2-2.description'),
          positions: [
            { name: t('formationPreview.positions.leftAttacker'), icon: Sword, x: 38, y: 18, color: 'text-blue-400' },
            { name: t('formationPreview.positions.rightAttacker'), icon: Sword, x: 62, y: 18, color: 'text-blue-400' },
            { name: t('formationPreview.positions.leftMidfielder'), icon: ArrowDownUp, x: 35, y: 40, color: 'text-blue-400' },
            { name: t('formationPreview.positions.rightMidfielder'), icon: ArrowDownUp, x: 65, y: 40, color: 'text-blue-400' },
            { name: t('formationPreview.positions.leftDefender'), icon: Shield, x: 32, y: 62, color: 'text-blue-400' },
            { name: t('formationPreview.positions.rightDefender'), icon: Shield, x: 68, y: 62, color: 'text-blue-400' },
            { name: t('formationPreview.positions.goalie'), icon: Hand, x: 50, y: 88, color: 'text-blue-400' }
          ],
          roles: [
            { role: t('formationPreview.roles.defenders'), count: 2, color: 'text-blue-400' },
            { role: t('formationPreview.roles.midfielders'), count: 2, color: 'text-yellow-400' },
            { role: t('formationPreview.roles.attackers'), count: 2, color: 'text-red-400' }
          ]
        };

      case FORMATIONS.FORMATION_2_3_1:
        return {
          name: t('formationPreview.formations.2-3-1.name'),
          description: t('formationPreview.formations.2-3-1.description'),
          positions: [
            { name: t('formationPreview.positions.attacker'), icon: Sword, x: 50, y: 18, color: 'text-blue-400' },
            { name: t('formationPreview.positions.leftMidfielder'), icon: ArrowDownUp, x: 32, y: 38, color: 'text-blue-400' },
            { name: t('formationPreview.positions.centerMidfielder'), icon: ArrowDownUp, x: 50, y: 42, color: 'text-blue-400' },
            { name: t('formationPreview.positions.rightMidfielder'), icon: ArrowDownUp, x: 68, y: 38, color: 'text-blue-400' },
            { name: t('formationPreview.positions.leftDefender'), icon: Shield, x: 35, y: 63, color: 'text-blue-400' },
            { name: t('formationPreview.positions.rightDefender'), icon: Shield, x: 65, y: 63, color: 'text-blue-400' },
            { name: t('formationPreview.positions.goalie'), icon: Hand, x: 50, y: 88, color: 'text-blue-400' }
          ],
          roles: [
            { role: t('formationPreview.roles.defenders'), count: 2, color: 'text-blue-400' },
            { role: t('formationPreview.roles.midfielders'), count: 3, color: 'text-yellow-400' },
            { role: t('formationPreview.roles.attacker'), count: 1, color: 'text-red-400' }
          ]
        };

      default:
        return null;
    }
  };

  const layout = getFormationLayout();
  if (!layout) return null;

  return (
    <Card variant="dark" className={className}>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-sky-200 mb-1">{layout.name}</h4>
        <p className="text-xs text-slate-400">{layout.description}</p>
      </div>
      
      {/* Field visualization */}
      <div 
        className="relative rounded-md border border-sky-700 bg-center bg-no-repeat aspect-[15/6] sm:aspect-[15/6] md:aspect-[15/6]"
        style={{ backgroundImage: `url(${fieldImage})`, backgroundSize: '100% auto' }}
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
    </Card>
  );
}
