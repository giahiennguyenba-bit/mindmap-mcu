#!/bin/bash

echo "🚀 Preparing Mindy Deployment to Firebase Hosting (WebFrameworks)"

# 1. Install Firebase CLI globally if not installed
if ! command -v firebase &> /dev/null
then
    echo "📦 Firebase CLI not found. Installing globally..."
    npm install -g firebase-tools
else
    echo "✅ Firebase CLI is installed."
fi

# 2. Login to Firebase
echo "🔑 Logging into Firebase..."
firebase login

# 3. Setup Secrets
# Note: Firebase Web Frameworks will automatically map this secret to process.env.GEMINI_API_KEY at runtime
echo "🔐 Setting up GEMINI_API_KEY secret..."
echo "Please enter your Gemini API Key:"
read -s API_KEY
echo -n "$API_KEY" | firebase functions:secrets:set GEMINI_API_KEY

# 4. Deploy!
echo "☁️ Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete! Mindy is now live."
