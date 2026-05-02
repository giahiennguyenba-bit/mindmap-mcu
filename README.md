# Mindy - AI Sentient Mentor 🧠✨

Mindy is a high-fidelity, sentient AI mentor designed for modern mental health support. Built with a "Cinematic Brutalist" aesthetic, Mindy leverages advanced neural reasoning and real-time 3D visualization to provide an immersive, empathetic counseling experience.

## 🌟 Key Features

- **Sentient 3D Core**: An interactive `OrganicSphere` powered by Three.js and custom GLSL shaders that reacts to your mood, stress levels, and energy in real-time.
- **Neural Reasoning**: Integration with **Gemini 3.1 Flash** for low-latency, high-reasoning psychological support and CBT (Cognitive Behavioral Therapy) frameworks.
- **Voice-First Interface**:
  - **Live Call Mode**: A FaceTime-like experience with AI.
  - **Voice-to-Text**: High-accuracy input using Web Speech API.
  - **Neural Text-to-Speech**: Natural-sounding vocal responses with bilingual support (English/Vietnamese).
- **Mobile-First Architecture**: Responsive stacked layout with a native-like bottom action dock and safe-area support.
- **Sentiment-Syncing UI**: The entire interface adapts its color palette and motion based on the emotional context of the conversation.

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), React, Framer Motion, TailwindCSS.
- **3D Engine**: Three.js, React Three Fiber (R3F), Drei.
- **AI/LLM**: Google Generative AI (@google/genai) - Gemini 3.1 Flash.
- **Voice**: Web Speech API (SpeechRecognition & SpeechSynthesis).
- **Styling**: Vanilla CSS + Glassmorphism.

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- A Google AI Studio API Key (Gemini API)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/mindmap-mcu.git
   cd mindmap-mcu
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📐 Architecture

- `src/components/3d`: Contains the `OrganicSphere` and custom shaders.
- `src/components/dashboard`: The main application hub and state controller.
- `src/app/api/chat`: Backend route for Gemini integration and neural parsing.

## 🎓 MCU Context

Developed as part of the Mental Health support initiative at **MingChuan University (MCU)**, focusing on student well-being through advanced AI interaction.

---

Created with ❤️ for the future of Mental Health.
