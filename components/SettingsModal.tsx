
import React, { useState, useContext, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { SettingsContext, Settings } from '../contexts/SettingsContext';
import { AuthContext } from '../contexts/AuthContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';


export const SettingsModal: React.FC = () => {
  const { settings, saveSettings, isSettingsModalOpen, setSettingsModalOpen, t, getApiKey } = useContext(SettingsContext);
  const { currentUser, updateUser } = useContext(AuthContext);
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState('');
  
  // Subscription State
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [paypalError, setPaypalError] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
    setUpgradeSuccess(''); // Reset on modal open
    setIsPaymentStep(false);
    setSelectedPlan('monthly');
    setPaypalError('');
  }, [settings, isSettingsModalOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => {
        setIsSaved(false);
        setSettingsModalOpen(false);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setLocalSettings(prev => ({ ...prev, [name]: checked }));
    } else {
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const plans = [
      { id: 'monthly', label: t('planMonthly'), priceDisplay: 'NT$120', value: '120' },
      { id: 'biannual', label: t('planBiannual'), priceDisplay: 'NT$560', value: '560' },
      { id: 'yearly', label: t('planYearly'), priceDisplay: 'NT$960', value: '960' },
  ];

  const currentPlan = plans.find(p => p.id === selectedPlan);

  const handlePayPalApprove = async (data: any, actions: any) => {
      try {
          const details = await actions.order.capture();
          console.log("PayPal Transaction completed by " + details.payer.name.given_name);
          
          if (currentUser) {
            let daysToAdd = 30;
            if (selectedPlan === 'biannual') daysToAdd = 120;
            if (selectedPlan === 'yearly') daysToAdd = 365;

            const now = new Date();
            let newExpiryDate = now;
            
            // If already subscribed and not expired, extend from current expiry
            if (currentUser.subscriptionExpiry) {
                const currentExpiry = new Date(currentUser.subscriptionExpiry);
                if (currentExpiry > now) {
                    newExpiryDate = currentExpiry;
                }
            }
            
            newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);

            const result = updateUser(currentUser.email, { 
                role: '付費用戶',
                subscriptionExpiry: newExpiryDate.toISOString()
            });

            if (result.success) {
                setUpgradeSuccess(t('upgradeSuccess'));
            } else {
                setPaypalError("Upgrade failed locally after payment: " + t(result.messageKey));
            }
          }
      } catch (err) {
          console.error("PayPal Capture Error:", err);
          setPaypalError(t('paymentFailed'));
      }
  };

  if (!isSettingsModalOpen) return null;

  return (
     <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => setSettingsModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden border-2 border-black dark:border-gray-600 max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 id="settings-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
                {t('settings')}
            </h2>
            <button onClick={() => setSettingsModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={t('close')}>
                <XMarkIcon className="h-6 w-6 dark:text-gray-300" />
            </button>
        </header>
        
        <main className="flex-grow p-6 overflow-y-auto">
          <form id="settings-form" onSubmit={handleSave} className="space-y-6">
            {/* Account Upgrade Section for General Users */}
            {currentUser?.role === '一般用戶' && (
              <fieldset className="space-y-4 p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border-2 border-amber-300 dark:border-amber-700/50 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-2 opacity-10">
                    <SparklesIcon className="h-24 w-24 text-amber-600" />
                 </div>
                <legend className="relative z-10 text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5" />
                  {t('upgradeAccount')}
                </legend>
                
                {upgradeSuccess ? (
                  <div className="p-6 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-xl text-center">
                    <div className="flex justify-center mb-3">
                        <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="font-bold text-lg">{upgradeSuccess}</p>
                  </div>
                ) : isPaymentStep ? (
                    // Payment Confirmation Step with PayPal
                    <div className="relative z-10 animate-fade-in">
                        <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-4">{t('confirmPaymentTitle')}</h4>
                        
                        <div className="bg-white/60 dark:bg-slate-900/60 p-5 rounded-xl border border-amber-200 dark:border-amber-800/50 mb-4 backdrop-blur-sm">
                             <div className="flex justify-between items-center mb-2 border-b border-dashed border-gray-300 dark:border-gray-600 pb-2">
                                 <span className="text-gray-600 dark:text-gray-300 font-medium">{t('selectedPlan')}</span>
                                 <span className="font-bold text-gray-900 dark:text-white">{currentPlan?.label}</span>
                             </div>
                             <div className="flex justify-between items-center pt-1">
                                 <span className="text-gray-600 dark:text-gray-300 font-medium">{t('paymentAmount')}</span>
                                 <span className="font-black text-2xl text-blue-600 dark:text-blue-400">{currentPlan?.priceDisplay}</span>
                             </div>
                        </div>
                        
                        {paypalError && (
                             <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-4">
                                 {paypalError}
                             </div>
                        )}

                        {settings.paypalClientId ? (
                            <div className="my-4">
                                <PayPalScriptProvider options={{ "clientId": settings.paypalClientId, currency: "TWD" }}>
                                    <PayPalButtons 
                                        style={{ layout: "vertical" }}
                                        createOrder={(data, actions) => {
                                            return actions.order.create({
                                                intent: "CAPTURE",
                                                purchase_units: [
                                                    {
                                                        amount: {
                                                            currency_code: "TWD",
                                                            value: currentPlan?.value || "120"
                                                        },
                                                        description: `AI Property Appraiser - ${currentPlan?.label}`
                                                    },
                                                ],
                                            });
                                        }}
                                        onApprove={handlePayPalApprove}
                                        onError={(err) => {
                                            console.error("PayPal Error:", err);
                                            setPaypalError(t('paymentError'));
                                        }}
                                    />
                                </PayPalScriptProvider>
                            </div>
                        ) : (
                            <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg text-sm mb-4">
                                {t('paypalNotConfigured')}
                            </div>
                        )}

                        <button 
                            type="button" 
                            onClick={() => setIsPaymentStep(false)} 
                            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            {t('back')}
                        </button>
                    </div>
                ) : (
                    // Plan Selection Step
                    <div className="relative z-10 space-y-4 animate-fade-in">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                            {t('upgradeDescription')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {plans.map(plan => (
                                <div 
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`cursor-pointer relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center text-center bg-white/80 dark:bg-slate-800/80 ${selectedPlan === plan.id ? 'border-amber-500 shadow-md scale-105 z-10 ring-2 ring-amber-200 dark:ring-amber-900' : 'border-transparent hover:border-amber-200 dark:hover:border-amber-800 hover:bg-white dark:hover:bg-slate-800 shadow-sm'}`}
                                >
                                    {selectedPlan === plan.id && (
                                        <div className="absolute -top-3 -right-3 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                                            <CheckCircleIcon className="h-5 w-5" />
                                        </div>
                                    )}
                                    <div className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">{plan.label}</div>
                                    <div className="text-amber-600 dark:text-amber-400 font-black text-lg">{plan.priceDisplay}</div>
                                </div>
                            ))}
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setIsPaymentStep(true)}
                            className="w-full px-4 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 mt-2 flex items-center justify-center gap-2"
                        >
                            {t('upgradeWithPaypal')}
                        </button>
                    </div>
                )}
              </fieldset>
            )}
            
            {/* Current Subscription Display for Paid Users */}
            {currentUser?.role === '付費用戶' && currentUser?.subscriptionExpiry && (
                 <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        <span className="font-bold text-lg text-green-900 dark:text-green-100">{t('paidUser')}</span>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-300 ml-9">
                        {t('subscriptionExpiresOn')}: <span className="font-mono font-bold">{new Date(currentUser.subscriptionExpiry).toLocaleDateString()}</span>
                    </p>
                 </div>
            )}

            {/* API Key Settings */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold text-gray-900 dark:text-white">{t('apiKeySettings')}</legend>
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                    {t('yourGeminiApiKey_linkText')}
                  </a>
                  <span className="text-gray-700 dark:text-gray-300 ml-1">({t('yourGeminiApiKey_promptText')})</span>
                </label>
                <input
                  type="password"
                  id="apiKey"
                  name="apiKey"
                  value={localSettings.apiKey}
                  onChange={handleChange}
                  placeholder={t('enterYourGeminiApiKey')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('apiKeyPrivacyNotice')}
                </p>
              </div>
               {currentUser?.role === '管理員' && (
                  <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                      <div>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="allowPublicApiKey"
                                checked={localSettings.allowPublicApiKey}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{t('enableGlobalApiKey')}</span>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {t('globalApiKeyNotice')}
                        </p>
                      </div>
                      {localSettings.allowPublicApiKey && (
                          <div className="mt-3">
                               <label htmlFor="publicApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('globalGeminiApiKey')}
                              </label>
                              <input
                                  type="password"
                                  id="publicApiKey"
                                  name="publicApiKey"
                                  value={localSettings.publicApiKey}
                                  onChange={handleChange}
                                  placeholder={t('enterGlobalApiKey')}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                          </div>
                      )}
                  </div>
               )}
            </fieldset>

            {/* Appearance Settings */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold text-gray-900 dark:text-white">{t('appearanceAndDisplay')}</legend>
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('theme')}
                </label>
                <select
                  id="theme"
                  name="theme"
                  value={localSettings.theme}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="light">{t('theme_light')}</option>
                  <option value="dark">{t('theme_dark')}</option>
                  <option value="system">{t('theme_system')}</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="font" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('font')}
                </label>
                <select
                  id="font"
                  name="font"
                  value={localSettings.font}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="sans">{t('fontSans')}</option>
                  <option value="serif">{t('fontSerif')}</option>
                  <option value="mono">{t('font_mono')}</option>
                  <option value="kai">{t('font_kai')}</option>
                  <option value="cursive">{t('font_cursive')}</option>
                </select>
              </div>
               <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('language')}
                </label>
                <select
                  id="language"
                  name="language"
                  value={localSettings.language}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="zh-TW">{t('lang_zh-TW')}</option>
                  <option value="zh-CN">{t('lang_zh-CN')}</option>
                  <option value="en">{t('lang_en')}</option>
                  <option value="ja">{t('lang_ja')}</option>
                </select>
              </div>
            </fieldset>
          </form>
        </main>
        
        <footer className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800/50">
            <button type="submit" form="settings-form" className={`px-6 py-3 font-semibold rounded-lg shadow-md transition-colors w-full sm:w-auto ${isSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
              {isSaved ? t('saved') : t('saveSettings')}
            </button>
        </footer>
      </div>
    </div>
  );
};
