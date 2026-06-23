'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { AlertCircle, Lock, Store, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const usernameVal = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const { error } = await authClient.signIn.username({
        username: usernameVal,
        password,
      });

      if (error) {
        setErrorMessage('Invalid credentials.');
        setIsPending(false);
        return;
      }

      router.push('/dashboard');
    } catch {
      setErrorMessage('Something went wrong.');
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Store className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{tCommon('appName')}</h1>
              <p className="text-white/80">{tCommon('pos')}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Manage your business with ease
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              Streamline your inventory, track sales, and grow your business with our comprehensive POS solution.
            </p>
          </div>
          
          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-sm text-white/70">Products Managed</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-3xl font-bold text-white">1000+</div>
              <div className="text-sm text-white/70">Orders Processed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Store className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{tCommon('appName')}</h1>
              <p className="text-sm text-muted-foreground">{tCommon('pos')}</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">{t('welcomeBack')}</CardTitle>
              <CardDescription>
                {t('signInToContinue')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('username')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                    <Input 
                      id="username" 
                      name="username" 
                      type="text" 
                      placeholder={t('username')}
                      className="ltr:pl-10 rtl:pr-10 h-11"
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                    <Input 
                      id="password" 
                      name="password" 
                      type="password" 
                      placeholder={t('password')}
                      className="ltr:pl-10 rtl:pr-10 h-11"
                      required 
                    />
                  </div>
                </div>
                
                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                
                <Button 
                  className="w-full h-11 font-semibold shadow-lg shadow-primary/25" 
                  type="submit" 
                  disabled={isPending}
                >
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('signingIn')}
                    </div>
                  ) : (
                    t('signIn')
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-0">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">Default credentials</span>
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg py-2 px-4 w-full">
                {t('username')}: <span className="font-mono font-medium text-foreground">admin</span> · {t('password')}: <span className="font-mono font-medium text-foreground">admin123</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
