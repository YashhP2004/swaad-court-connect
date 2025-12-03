import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import {
    DemandLevel,
    getDemandLevelConfig,
    formatWaitTime
} from '@/utils/demandCalculations';
import { cn } from '@/lib/utils';

interface DemandBadgeProps {
    level: DemandLevel;
    waitTime?: number;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    showWaitTime?: boolean;
    className?: string;
}

export function DemandBadge({
    level,
    waitTime,
    size = 'md',
    showIcon = true,
    showWaitTime = true,
    className
}: DemandBadgeProps) {
    const config = getDemandLevelConfig(level);

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5'
    };

    const colorMap = {
        green: 'bg-green-500 text-white border-green-600',
        yellow: 'bg-yellow-500 text-black border-yellow-600',
        orange: 'bg-orange-500 text-white border-orange-600',
        red: 'bg-red-500 text-white border-red-600'
    };

    const colorClass = colorMap[config.color as keyof typeof colorMap] || 'bg-gray-500 text-white';

    return (
        <Badge
            variant="outline"
            className={cn(
                sizeClasses[size],
                'font-bold flex items-center gap-1.5 shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg border',
                colorClass,
                className
            )}
        >
            {showIcon && <span className="text-base animate-pulse-slow drop-shadow-sm">{config.icon}</span>}
            <span className="font-extrabold tracking-wide drop-shadow-sm">{config.label}</span>
            {showWaitTime && waitTime !== undefined && (
                <>
                    <span className="opacity-60 mx-1">•</span>
                    <Clock className="h-3 w-3" />
                    <span>{formatWaitTime(waitTime)}</span>
                </>
            )}
        </Badge>
    );
}

interface DemandIndicatorProps {
    level: DemandLevel;
    waitTime?: number;
    showDescription?: boolean;
    className?: string;
}

export function DemandIndicator({
    level,
    waitTime,
    showDescription = true,
    className
}: DemandIndicatorProps) {
    const config = getDemandLevelConfig(level);

    return (
        <div className={cn('flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm', className)}>
            <div className="flex items-center gap-3">
                <span className="text-3xl filter drop-shadow-md animate-bounce-slow">{config.icon}</span>
                <div>
                    <p className={cn('font-extrabold text-sm tracking-wide', config.textColor)}>
                        {config.label}
                    </p>
                    {showDescription && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {config.description}
                        </p>
                    )}
                </div>
            </div>
            {waitTime !== undefined && (
                <div className="ml-auto flex items-center gap-1.5 text-sm font-medium text-white/80 bg-white/10 px-3 py-1 rounded-full">
                    <Clock className="h-4 w-4 text-peach-400" />
                    <span>{formatWaitTime(waitTime)}</span>
                </div>
            )}
        </div>
    );
}

interface DemandLevelCardProps {
    level: DemandLevel;
    waitTime: number;
    activeOrders: number;
    capacityUtilization: number;
    className?: string;
}

export function DemandLevelCard({
    level,
    waitTime,
    activeOrders,
    capacityUtilization,
    className
}: DemandLevelCardProps) {
    const config = getDemandLevelConfig(level);

    return (
        <div
            className={cn(
                'p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg',
                config.bgColor.replace('100', '500/5'),
                config.borderColor,
                className
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-4xl filter drop-shadow-lg">{config.icon}</span>
                    <div>
                        <h3 className={cn('font-extrabold text-xl tracking-tight', config.textColor)}>
                            {config.label}
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium">
                            {config.description}
                        </p>
                    </div>
                </div>
                <DemandBadge level={level} size="sm" showIcon={false} />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                    <p className="text-2xl font-bold text-foreground">{activeOrders}</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Active Orders</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                    <p className="text-2xl font-bold text-foreground">{capacityUtilization}%</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Capacity</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                    <p className="text-2xl font-bold text-foreground">{waitTime}</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Min Wait</p>
                </div>
            </div>
        </div>
    );
}
