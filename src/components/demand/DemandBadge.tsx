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
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5'
    };

    return (
        <Badge
            variant={config.badgeVariant}
            className={cn(
                sizeClasses[size],
                'font-medium flex items-center gap-1.5',
                config.bgColor,
                config.borderColor,
                config.textColor,
                className
            )}
        >
            {showIcon && <span className="text-base">{config.icon}</span>}
            <span>{config.label}</span>
            {showWaitTime && waitTime !== undefined && (
                <>
                    <span className="text-muted-foreground">•</span>
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
        <div className={cn('flex items-center gap-2', className)}>
            <div className="flex items-center gap-1.5">
                <span className="text-2xl">{config.icon}</span>
                <div>
                    <p className={cn('font-semibold text-sm', config.textColor)}>
                        {config.label}
                    </p>
                    {showDescription && (
                        <p className="text-xs text-muted-foreground">
                            {config.description}
                        </p>
                    )}
                </div>
            </div>
            {waitTime !== undefined && (
                <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
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
                'p-4 rounded-lg border-2',
                config.bgColor,
                config.borderColor,
                className
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-3xl">{config.icon}</span>
                    <div>
                        <h3 className={cn('font-bold text-lg', config.textColor)}>
                            {config.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {config.description}
                        </p>
                    </div>
                </div>
                <DemandBadge level={level} size="sm" showIcon={false} />
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center">
                    <p className="text-2xl font-bold">{activeOrders}</p>
                    <p className="text-xs text-muted-foreground">Active Orders</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold">{capacityUtilization}%</p>
                    <p className="text-xs text-muted-foreground">Capacity</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold">{waitTime}</p>
                    <p className="text-xs text-muted-foreground">Min Wait</p>
                </div>
            </div>
        </div>
    );
}
