'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <div className="min-h-screen relative flex items-center justify-center">
            {/* Wallpaper backdrop */}
            <div
                className="fixed inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/wallpaper.png')" }}
            />
            <div className="fixed inset-0 bg-black/55 backdrop-blur-[3px]" />

            <div className="relative z-10 animate-fade-up">
                <SignUp
                    appearance={{
                        elements: {
                            rootBox: "mx-auto",
                            card: "bg-black/50 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50",
                            headerTitle: "text-white",
                            headerSubtitle: "text-white/60",
                            socialButtonsBlockButton: "bg-white/[0.06] border-white/10 hover:bg-white/[0.12] text-white transition-colors",
                            socialButtonsBlockButtonText: "text-white",
                            dividerLine: "bg-white/10",
                            dividerText: "text-white/40",
                            formFieldLabel: "text-white/70",
                            formFieldInput: "bg-white/[0.06] border-white/10 text-white placeholder:text-white/35 focus:border-emerald-400/60 focus:ring-emerald-400/20",
                            formButtonPrimary: "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-lg shadow-emerald-500/20 transition-all",
                            footerActionLink: "text-emerald-400 hover:text-emerald-300",
                            identityPreviewEditButton: "text-emerald-400 hover:text-emerald-300",
                        },
                    }}
                />
            </div>
        </div>
    );
}
