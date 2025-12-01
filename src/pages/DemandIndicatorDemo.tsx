import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Play, Pause } from 'lucide-react';
import {
    DemandBadge,
    DemandIndicator,
    DemandLevelCard
} from '@/components/demand/DemandBadge';
import {
    KitchenCapacityMeter,
    DemandStatusCard,
    HighDemandAlert,
    DemandOverview
} from '@/components/vendor/DemandDashboard';
import {
    DemandMetrics,
    generateMockDemandMetrics,
    calculateDemandScore,
    getDemandLevel,
    calculateDynamicWaitTime,
    calculateCapacityUtilization
} from '@/utils/demandCalculations';

export default function DemandIndicatorDemo() {
    const [activeOrders, setActiveOrders] = useState(5);
    const [maxCapacity] = useState(10);
    const [orderVelocity, setOrderVelocity] = useState(0.5);
    const [baseWaitTime] = useState(15);
    const [autoUpdate, setAutoUpdate] = useState(false);

    // Calculate metrics
    const demandScore = calculateDemandScore(activeOrders, maxCapacity, orderVelocity);
    const demandLevel = getDemandLevel(demandScore);
    const capacityUtilization = calculateCapacityUtilization(activeOrders, maxCapacity);
    const estimatedWaitTime = calculateDynamicWaitTime(baseWaitTime, demandScore);

    const metrics: DemandMetrics = {
        activeOrders,
        orderVelocity,
        capacityUtilization,
        demandScore,
        demandLevel,
        estimatedWaitTime,
        lastUpdated: new Date()
    };

    // Auto-update simulation
    useEffect(() => {
        if (!autoUpdate) return;

        const interval = setInterval(() => {
            setActiveOrders(prev => Math.max(0, Math.min(maxCapacity, prev + Math.floor(Math.random() * 3) - 1)));
            setOrderVelocity(Math.random() * 2);
        }, 2000);

        return () => clearInterval(interval);
    }, [autoUpdate, maxCapacity]);

    return (
        <div className="min-h-screen bg-gradient-warm p-6">
            <div className="container mx-auto max-w-7xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-heading font-bold">Demand Indicator System</h1>
                        <p className="text-muted-foreground">
                            Real-time restaurant demand visualization and management
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={autoUpdate ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => setAutoUpdate(!autoUpdate)}
                        >
                            {autoUpdate ? (
                                <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Stop Auto-Update
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Start Auto-Update
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setActiveOrders(Math.floor(Math.random() * maxCapacity));
                                setOrderVelocity(Math.random() * 2);
                            }}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Randomize
                        </Button>
                    </div>
                </div>

                {/* Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>Simulation Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Active Orders: {activeOrders}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max={maxCapacity}
                                    value={activeOrders}
                                    onChange={(e) => setActiveOrders(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Order Velocity: {orderVelocity.toFixed(2)} orders/min
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={orderVelocity}
                                    onChange={(e) => setOrderVelocity(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3 p-4 bg-muted rounded-lg">
                            <div className="text-center">
                                <p className="text-2xl font-bold">{demandScore}</p>
                                <p className="text-xs text-muted-foreground">Demand Score</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold">{capacityUtilization}%</p>
                                <p className="text-xs text-muted-foreground">Capacity</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold">{estimatedWaitTime} min</p>
                                <p className="text-xs text-muted-foreground">Wait Time</p>
                            </div>
                            <div className="text-center">
                                <DemandBadge level={demandLevel} showWaitTime={false} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Component Showcase */}
                <Tabs defaultValue="badges" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="badges">Badges</TabsTrigger>
                        <TabsTrigger value="vendor">Vendor Dashboard</TabsTrigger>
                        <TabsTrigger value="customer">Customer View</TabsTrigger>
                        <TabsTrigger value="overview">Full Overview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="badges" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Demand Badges</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="font-semibold mb-3">Current State</h3>
                                    <div className="flex flex-wrap gap-3">
                                        <DemandBadge level={demandLevel} waitTime={estimatedWaitTime} size="sm" />
                                        <DemandBadge level={demandLevel} waitTime={estimatedWaitTime} size="md" />
                                        <DemandBadge level={demandLevel} waitTime={estimatedWaitTime} size="lg" />
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="font-semibold mb-3">All Levels</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <DemandLevelCard
                                            level="low"
                                            waitTime={15}
                                            activeOrders={2}
                                            capacityUtilization={20}
                                        />
                                        <DemandLevelCard
                                            level="medium"
                                            waitTime={20}
                                            activeOrders={5}
                                            capacityUtilization={50}
                                        />
                                        <DemandLevelCard
                                            level="high"
                                            waitTime={25}
                                            activeOrders={7}
                                            capacityUtilization={70}
                                        />
                                        <DemandLevelCard
                                            level="very-high"
                                            waitTime={35}
                                            activeOrders={9}
                                            capacityUtilization={90}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="vendor" className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <DemandStatusCard metrics={metrics} maxCapacity={maxCapacity} />
                            <KitchenCapacityMeter
                                activeOrders={activeOrders}
                                maxCapacity={maxCapacity}
                                utilizationPercent={capacityUtilization}
                            />
                        </div>

                        <HighDemandAlert
                            capacityUtilization={capacityUtilization}
                            activeOrders={activeOrders}
                            maxCapacity={maxCapacity}
                            onPauseOrders={() => alert('Pausing new orders...')}
                        />
                    </TabsContent>

                    <TabsContent value="customer" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Restaurant Card View</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg">Pizza Hut</h3>
                                            <p className="text-sm text-muted-foreground">Italian, Fast Food</p>
                                        </div>
                                        <DemandBadge level={demandLevel} waitTime={estimatedWaitTime} />
                                    </div>
                                    <DemandIndicator level={demandLevel} waitTime={estimatedWaitTime} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="overview">
                        <DemandOverview metrics={metrics} maxCapacity={maxCapacity} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
