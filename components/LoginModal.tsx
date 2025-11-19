
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { GoogleIcon } from './icons/GoogleIcon';
import { AppleIcon } from './icons/AppleIcon';
import type { UserRole } from '../types';
import { SettingsContext } from '../contexts/SettingsContext';
import { APP_VERSION } from '../constants';


export const LoginModal: React.FC = () => {
  const { login, register, setLoginModalOpen } = useContext(AuthContext);
  const { t, settings } = useContext(SettingsContext);
  
  const [isRegister, setIsRegister] = useState(false);
  const [socialRegisterProvider, setSocialRegisterProvider] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [captcha, setCaptcha] = useState('');
  const [generatedCaptcha, setGeneratedCaptcha] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const [error, setError] = useState('');

  // Generate a new captcha code and set phone prefix when entering registration mode
  useEffect(() => {
    if (isRegister) {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCaptcha(newCode);
        setCaptcha('');

        // Set Phone Prefix based on Language
        let prefix = '';
        switch (settings.language) {
            case 'zh-TW': prefix = '886-'; break;
            case 'zh-CN': prefix = '86-'; break;
            case 'ja': prefix = '81-'; break;
            case 'en': prefix = '1-'; break;
            default: prefix = '886-';
        }
        setPhone(prefix);
    } else {
        setRegistrationSuccess(false);
    }
  }, [isRegister, settings.language]);

  const handleMainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('error_fillEmailPassword'));
      return;
    }
    if (isRegister) {
       if (!name.trim() || !phone.trim()) {
        setError(t('error_fillNamePhone'));
        return;
      }
      
      if (captcha !== generatedCaptcha) {
          setError(t('captchaError'));
          // Regenerate captcha on error to prevent brute force
          const newCode = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedCaptcha(newCode);
          setCaptcha('');
          return;
      }

      const result = register({ email, password, name, phone });
      if (!result.success) {
        setError(t(result.messageKey));
        // Refresh captcha on failure
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCaptcha(newCode);
        setCaptcha('');
      } else {
          setRegistrationSuccess(true);
      }
    } else {
      const success = login(email, password);
      if (!success) {
        setError(t('loginFailed'));
      }
    }
  };

  const handleSocialClick = (provider: 'Google' | 'Apple') => {
    setIsRegister(true);
    setSocialRegisterProvider(provider);
    setError('');
  };
  
  const toggleFormType = () => {
    setIsRegister(!isRegister);
    setSocialRegisterProvider(null);
    setError('');
    setRegistrationSuccess(false);
  };
  
  const switchToLoginAfterSuccess = () => {
      setIsRegister(false);
      setSocialRegisterProvider(null);
      setError('');
      setRegistrationSuccess(false);
      // Pre-fill email for convenience
      // Password remains in state, user can just click login
  };


  const getTitle = () => {
    if (registrationSuccess) {
        return t('registrationSuccess');
    }
    if (isRegister) {
      return socialRegisterProvider 
        ? t('socialLoginTitle', { provider: socialRegisterProvider }) 
        : t('registerTitle');
    }
    return t('loginTitle');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setLoginModalOpen(false)}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden border-2 border-black" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <SparklesIcon className="h-6 w-6 text-blue-600"/>
             {getTitle()}
          </h2>
          <button onClick={() => setLoginModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="p-6 space-y-4">
          {registrationSuccess ? (
              <div className="text-center space-y-6">
                  <div className="flex justify-center">
                      <div className="bg-green-100 p-4 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-green-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                      </div>
                  </div>
                  <p className="text-gray-700">{t('registrationSuccessPrompt')}</p>
                  <button 
                    onClick={switchToLoginAfterSuccess}
                    className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                  >
                      {t('clickToLogin')}
                  </button>
              </div>
          ) : (
            <>
                {!isRegister && (
                    <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onClick={() => handleSocialClick('Google')} className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors">
                            <GoogleIcon className="h-5 w-5" />
                            <span className="text-sm font-medium text-gray-700">{t('loginWithGoogle')}</span>
                        </button>
                        <button onClick={() => handleSocialClick('Apple')} className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors">
                            <AppleIcon className="h-5 w-5" />
                            <span className="text-sm font-medium text-gray-700">{t('loginWithApple')}</span>
                        </button>
                    </div>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-sm text-gray-500">{t('or')}</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>
                    </>
                )}

                <form onSubmit={handleMainSubmit} className="space-y-4">
                    {isRegister && socialRegisterProvider && (
                    <div className="text-sm text-center p-3 bg-gray-100 rounded-lg border border-gray-200">
                        {t('socialRegisterPrompt', { provider: socialRegisterProvider })}
                    </div>
                    )}
                    {isRegister && (
                        <>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-600 mb-1">
                            {t('name')}
                            </label>
                            <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            required
                            />
                        </div>
                        <div>
                            <label htmlFor="phone"className="block text-sm font-medium text-gray-600 mb-1">
                            {t('phone')}
                            </label>
                            <input
                            type="tel"
                            id="phone"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            required
                            />
                        </div>
                        </>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
                        {t('email')}
                        </label>
                        <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        required
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="block text-sm font-medium text-gray-600 mb-1">
                        {t('password')}
                        </label>
                        <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        required
                        minLength={isRegister ? 6 : undefined}
                        />
                        {isRegister && <p className="text-xs text-gray-500 mt-1">{t('passwordMinLength')}</p>}
                    </div>

                    {isRegister && (
                        <div className="flex items-end gap-3">
                            <div className="flex-grow">
                                <label htmlFor="captcha" className="block text-sm font-medium text-gray-600 mb-1">
                                    {t('captcha')}
                                </label>
                                <input
                                    type="text"
                                    id="captcha"
                                    value={captcha}
                                    onChange={e => setCaptcha(e.target.value)}
                                    placeholder={t('captchaPlaceholder')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    required
                                    maxLength={6}
                                />
                            </div>
                            <div className="flex-shrink-0 h-[42px] px-4 bg-gray-200 border border-gray-300 rounded-lg flex items-center justify-center select-none font-mono text-lg font-bold text-gray-600 tracking-widest">
                                {generatedCaptcha}
                            </div>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

                    <button type="submit" className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        {t(isRegister ? 'register' : 'login')}
                    </button>

                    <p className="text-sm text-center">
                        {t(isRegister ? 'alreadyHaveAccount' : 'noAccountYet')}
                        <button type="button" onClick={toggleFormType} className="font-medium text-blue-600 hover:underline ml-1">
                        {t(isRegister ? 'clickToLogin' : 'clickToRegister')}
                        </button>
                    </p>
                </form>
                
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400 font-mono">
                        {t('appTitle')} {APP_VERSION}
                    </p>
                </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
