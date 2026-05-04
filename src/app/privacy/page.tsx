import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#050505] text-white/90 p-8 md:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Privacy Policy for MindMap MCU</h1>
        <p className="text-sm text-white/50 uppercase tracking-widest">Last Updated: May 5, 2026</p>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Introduction</h2>
          <p className="text-white/70 leading-relaxed">
            MindMap MCU ("we," "our," or "the App") is a student-led project at Ming Chuan University. We respect your privacy and are committed to protecting the personal data you share with us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">2. Data We Collect</h2>
          <ul className="list-disc list-inside space-y-3 text-white/70 leading-relaxed">
            <li><strong className="text-white/90">Google Account Information:</strong> We collect your name and email address through Firebase Auth to identify you.</li>
            <li><strong className="text-white/90">Google Calendar Data:</strong> We request read-only access to your calendar events to provide contextual mental health support and personalized schedule suggestions.</li>
            <li><strong className="text-white/90">Chat Logs:</strong> We temporarily process your messages to Mindy (the AI Agent) to provide emotional support.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">3. How We Use Your Data</h2>
          <p className="text-white/70 leading-relaxed">We use Google Calendar data exclusively to:</p>
          <ul className="list-disc list-inside space-y-2 text-white/70 leading-relaxed pl-4">
            <li>Identify gaps in your schedule for "Healing Breaks."</li>
            <li>Provide contextual reminders based on your campus activities.</li>
          </ul>
          <p className="text-[#FF2D55] font-medium mt-4">We DO NOT sell your data, share it with third parties, or use it for advertising.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">4. Data Storage & Security</h2>
          <ul className="list-disc list-inside space-y-3 text-white/70 leading-relaxed">
            <li>Calendar data is processed in real-time and is not permanently stored on our servers.</li>
            <li>We utilize Firebase and Google Cloud's secure infrastructure to manage authentication tokens.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">5. Your Rights</h2>
          <p className="text-white/70 leading-relaxed">
            You can revoke MindMap MCU’s access to your Google Calendar at any time through your Google Security Settings.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">6. Contact Us</h2>
          <p className="text-white/70 leading-relaxed">
            If you have questions about this policy, please contact us at: <a href="mailto:giahiennguyenba@gmail.com" className="text-blue-400 hover:underline">giahiennguyenba@gmail.com</a>
          </p>
        </section>
        
        <div className="pt-12 border-t border-white/10">
            <a href="/" className="text-sm text-white/50 hover:text-white transition-colors">
              &larr; Back to MindMap MCU
            </a>
        </div>
      </div>
    </div>
  );
}
