import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { setupAdminUser } from '@/lib/firebase/adminSetup';
import { Shield, CheckCircle } from 'lucide-react';

/**
 * Admin Setup Component
 * This is a one-time setup component to grant admin privileges to a user
 * Should be removed or protected after initial setup
 */
export default function AdminSetup() {
    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSetupAdmin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId || !email || !name) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            await setupAdminUser(userId, { email, name });
            toast.success('Admin user setup successful!');
            setIsSuccess(true);

            // Clear form
            setUserId('');
            setEmail('');
            setName('');
        } catch (error: any) {
            console.error('Error setting up admin:', error);
            toast.error(error.message || 'Failed to setup admin user');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Admin Setup</CardTitle>
                    <CardDescription>
                        Grant admin privileges to a user account
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {isSuccess && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-green-900">Success!</p>
                                <p className="text-xs text-green-700 mt-1">
                                    Admin privileges have been granted. You can now log in with the admin account.
                                </p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSetupAdmin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="userId">User ID (UID)</Label>
                            <Input
                                id="userId"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="Enter Firebase Auth UID"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Find this in Firebase Console → Authentication → Users
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Admin Name"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Setting up...' : 'Setup Admin User'}
                        </Button>
                    </form>

                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>Important:</strong> This page should only be used for initial setup.
                            Remove or protect this route after creating your admin account.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
