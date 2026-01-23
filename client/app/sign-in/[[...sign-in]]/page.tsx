'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
    return (
        <div className="min-h-screen relative flex items-center justify-center">
            {/* Background Image */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/back_for_proj.jpg')" }}
            />
            {/* Dark overlay for readability */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />

            {/* Ambient background effects - forest inspired */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime-500/5 rounded-full blur-3xl" />
            </div>

            {/* Sign In Component */}
            <div className="relative z-10">
                <SignIn
                    appearance={{
                        elements: {
                            rootBox: "mx-auto",
                            card: "bg-black/40 backdrop-blur-xl border border-emerald-900/30 shadow-2xl shadow-emerald-500/10",
                            headerTitle: "text-white",
                            headerSubtitle: "text-slate-400",
                            socialButtonsBlockButton: "bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-white",
                            socialButtonsBlockButtonText: "text-white",
                            dividerLine: "bg-emerald-900/30",
                            dividerText: "text-slate-500",
                            formFieldLabel: "text-slate-300",
                            formFieldInput: "bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20",
                            formButtonPrimary: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/20",
                            footerActionLink: "text-emerald-400 hover:text-emerald-300",
                            identityPreviewEditButton: "text-emerald-400 hover:text-emerald-300",
                        },
                    }}
                />
            </div>
        </div>
    );
}
