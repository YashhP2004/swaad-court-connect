import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    AlertCircle,
    TrendingUp,
    Clock,
    Users,
    Activity
} from 'lucide-react';
import {
    DemandMetrics,
    getDemandLevelConfig,
    formatWaitTime,
    shouldShowHighDemandAlert,
    getDemandRecommendation
} from '@/utils/demandCalculations';
import { DemandBadge, DemandIndicator } from '@/components/demand/DemandBadge';
import { cn } from '@/lib/utils';

interface KitchenCapacityMeterProps {
    activeOrders: number;
    maxCapacity: number;
    utilizationPercent: number;
    className?: string;
}

export function KitchenCapacityMeter({
    activeOrders,
    maxCapacity,
    utilizationPercent,
    className
}: KitchenCapacityMeterProps) {
    const getUtilizationColor = (percent: number) => {
        if (percent < 50) return 'bg-green-500';
        if (percent < 75) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Kitchen Capacity
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Utilization</span>
                        <span className="font-bold">{utilizationPercent}%</span>
                    </div>
                    <Progress
                        value={utilizationPercent}
                        className="h-3"
                        indicatorClassName={getUtilizationColor(utilizationPercent)}
                    />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Active Orders</span>
                    </div>
                    <span className="text-2xl font-bold">
                        {activeOrders} <span className="text-sm text-muted-foreground">/ {maxCapacity}</span>
                    </span>
                </div>

                {utilizationPercent >= 80 && (
                    <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            Kitchen at {utilizationPercent}% capacity
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

interface DemandStatusCardProps {
    metrics: DemandMetrics;
    maxCapacity: number;
    className?: string;
}

export function DemandStatusCard({
    metrics,
    maxCapacity,
    className
}: DemandStatusCardProps) {
    const config = getDemandLevelConfig(metrics.demandLevel);
    const showAlert = shouldShowHighDemandAlert(metrics.capacityUtilization);

    return (
        <Card className={cn('border-2', config.borderColor, className)}>
            <CardHeader className={cn('pb-3', config.bgColor)}>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Current Demand Status</CardTitle>
                    <DemandBadge level={metrics.demandLevel} size="sm" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {/* Demand Indicator */}
                <DemandIndicator
                    level={metrics.demandLevel}
                    waitTime={metrics.estimatedWaitTime}
                />

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-2xl font-bold">{metrics.activeOrders}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-2xl font-bold">{metrics.orderVelocity.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Orders/min</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-2xl font-bold">{metrics.estimatedWaitTime}</p>
                        <p className="text-xs text-muted-foreground">Min wait</p>
                    </div>
                </div>

                {/* Capacity Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Kitchen Capacity</span>
                        <span className="font-semibold">{metrics.capacityUtilization}%</span>
                    </div>
                    <Progress
                        value={metrics.capacityUtilization}
                        className="h-2"
                    />
                </div>

                {/* High Demand Alert */}
                {showAlert && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>High Demand Alert!</AlertTitle>
                        <AlertDescription className="text-sm">
                            Your kitchen is at {metrics.capacityUtilization}% capacity.
                            Consider pausing new orders temporarily or increasing prep time estimates.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Recommendation */}
                <div className={cn(
                    'p-3 rounded-lg text-sm text-center font-medium',
                    config.bgColor,
                    config.textColor
                )}>
                    {getDemandRecommendation(metrics.demandLevel)}
                </div>

                {/* Last Updated */}
                <p className="text-xs text-muted-foreground text-center">
                    Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
                </p>
            </CardContent>
        </Card>
    );
}

interface HighDemandAlertProps {
    capacityUtilization: number;
    activeOrders: number;
    maxCapacity: number;
    onPauseOrders?: () => void;
    className?: string;
}

export function HighDemandAlert({
    capacityUtilization,
    activeOrders,
    maxCapacity,
    onPauseOrders,
    className
}: HighDemandAlertProps) {
    if (!shouldShowHighDemandAlert(capacityUtilization)) {
        return null;
    }

    return (
        <Alert variant="destructive" className={className}>
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold">⚠️ High Demand Alert!</AlertTitle>
            <AlertDescription className="space-y-2">
                <p>
                    Your kitchen is operating at <strong>{capacityUtilization}%</strong> capacity
                    with <strong>{activeOrders} active orders</strong> (max: {maxCapacity}).
                </p>
                <p className="text-sm">
                    <strong>Recommendations:</strong>
                </p>
                <ul className="text-sm list-disc list-inside space-y-1">
                    <li>Increase estimated preparation times</li>
                    <li>Temporarily pause accepting new orders</li>
                    <li>Focus on completing current orders</li>
                    <li>Consider adding kitchen staff if available</li>
                </ul>
                {onPauseOrders && (
                    <button
                        onClick={onPauseOrders}
                        className="mt-2 px-4 py-2 bg-white text-red-600 rounded-md text-sm font-medium hover:bg-red-50"
                    >
                        Pause New Orders
                    </button>
                )}
            </AlertDescription>
        </Alert>
    );
}

interface DemandOverviewProps {
    metrics: DemandMetrics;
    maxCapacity: number;
    className?: string;
}

export function DemandOverview({
    metrics,
    maxCapacity,
    className
}: DemandOverviewProps) {
    return (
        <div className={cn('space-y-4', className)}>
            <div className="grid md:grid-cols-2 gap-4">
                <DemandStatusCard metrics={metrics} maxCapacity={maxCapacity} />
                <KitchenCapacityMeter
                    activeOrders={metrics.activeOrders}
                    maxCapacity={maxCapacity}
                    utilizationPercent={metrics.capacityUtilization}
                />
            </div>

            <HighDemandAlert
                capacityUtilization={metrics.capacityUtilization}
                activeOrders={metrics.activeOrders}
                maxCapacity={maxCapacity}
            />
        </div>
    );
}
