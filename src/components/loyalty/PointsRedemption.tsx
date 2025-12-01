import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Gift, AlertCircle, Sparkles } from 'lucide-react';
import {
    validatePointsRedemption,
    applyLoyaltyDiscount,
    getMaxRedeemablePoints,
    pointsToCurrency,
    POINTS_INCREMENT
} from '@/utils/loyaltyCalculations';

interface PointsRedemptionProps {
    availablePoints: number;
    orderSubtotal: number;
    onPointsChange: (points: number, discount: number) => void;
    className?: string;
}

export function PointsRedemption({
    availablePoints,
    orderSubtotal,
    onPointsChange,
    className = ''
}: PointsRedemptionProps) {
    const [usePoints, setUsePoints] = useState(false);
    const [pointsToRedeem, setPointsToRedeem] = useState(0);
    const [error, setError] = useState<string>('');

    // Calculate maximum redeemable points
    const maxPoints = getMaxRedeemablePoints(availablePoints, orderSubtotal);

    // Reset when toggled off
    useEffect(() => {
        if (!usePoints) {
            setPointsToRedeem(0);
            setError('');
            onPointsChange(0, 0);
        }
    }, [usePoints, onPointsChange]);

    // Validate and apply points
    useEffect(() => {
        if (usePoints && pointsToRedeem > 0) {
            const validation = validatePointsRedemption(
                availablePoints,
                pointsToRedeem,
                orderSubtotal
            );

            if (!validation.valid) {
                setError(validation.error || '');
                onPointsChange(0, 0);
            } else {
                setError('');
                const result = applyLoyaltyDiscount(orderSubtotal, pointsToRedeem);
                onPointsChange(pointsToRedeem, result.discountAmount);
            }
        }
    }, [pointsToRedeem, usePoints, availablePoints, orderSubtotal, onPointsChange]);

    const handleSliderChange = (value: number[]) => {
        setPointsToRedeem(value[0]);
    };

    const handleQuickSelect = (percentage: number) => {
        const points = Math.floor((maxPoints * percentage) / POINTS_INCREMENT) * POINTS_INCREMENT;
        setPointsToRedeem(points);
    };

    // Don't show if user has no points or order is too small
    if (availablePoints < 100 || orderSubtotal < 200) {
        return null;
    }

    const discount = pointsToRedeem * 0.1;

    return (
        <Card className={`border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 ${className}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                        <Gift className="w-5 h-5" />
                        💎 Loyalty Points
                    </CardTitle>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        {availablePoints} points
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Points Balance */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                    <div>
                        <p className="text-sm text-muted-foreground">Available Points</p>
                        <p className="text-2xl font-bold text-purple-700">{availablePoints}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Worth up to</p>
                        <p className="text-xl font-semibold text-green-600">
                            {pointsToCurrency(maxPoints)}
                        </p>
                    </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">Use loyalty points</span>
                    </div>
                    <Switch
                        checked={usePoints}
                        onCheckedChange={setUsePoints}
                    />
                </div>

                {/* Points Selection */}
                {usePoints && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                        {/* Quick Select Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickSelect(0.25)}
                                className="text-xs"
                            >
                                25%
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickSelect(0.50)}
                                className="text-xs"
                            >
                                50%
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickSelect(1.0)}
                                className="text-xs"
                            >
                                Max
                            </Button>
                        </div>

                        {/* Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Redeem points:</span>
                                <span className="font-semibold text-purple-700">
                                    {pointsToRedeem} points
                                </span>
                            </div>
                            <Slider
                                value={[pointsToRedeem]}
                                onValueChange={handleSliderChange}
                                max={maxPoints}
                                step={POINTS_INCREMENT}
                                className="py-4"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0</span>
                                <span>{maxPoints} max</span>
                            </div>
                        </div>

                        {/* Discount Display */}
                        {pointsToRedeem > 0 && !error && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-green-800">
                                        Discount Applied
                                    </span>
                                    <span className="text-2xl font-bold text-green-600">
                                        -₹{discount.toFixed(0)}
                                    </span>
                                </div>
                                <p className="text-xs text-green-700">
                                    You're saving ₹{discount.toFixed(0)} with {pointsToRedeem} points!
                                </p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Info Message */}
                        {!error && maxPoints > 0 && (
                            <p className="text-xs text-muted-foreground text-center">
                                You can redeem up to {maxPoints} points (₹{(maxPoints * 0.1).toFixed(0)}) on this order
                            </p>
                        )}
                    </div>
                )}

                {/* Promotional Message */}
                {!usePoints && (
                    <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-800 text-center">
                            🎁 Use your points to get instant discounts!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
