# Pocket Money — Deployment Guide

## 1. What is included

- Mobile-responsive salary, budget, expense and savings-goal tracker.
- Progressive Web App (PWA) manifest and Pocket Money app icon.
- Service worker caching for the app shell, so the app can reopen offline after its first successful load.
- GitHub Actions workflow at `.github/workflows/deploy-pocket-money.yml` to publish the `frontend/` folder to GitHub Pages when frontend files change on `main`.

## 2. Enable GitHub Pages

1. Open the repository: https://github.com/afsalpg979-code/FALCONS-AI
2. Select **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and select **Deploy Pocket Money to GitHub Pages**.
5. If no run starts automatically, choose **Run workflow** on the `main` branch.
6. Wait until the workflow's deploy job succeeds.

The app should then be available at:

https://afsalpg979-code.github.io/FALCONS-AI/pocket-money.html

The URL will only work after GitHub Pages is enabled and the workflow completes successfully.

## 3. Install on Android

1. Open the deployed URL in Chrome.
2. Open Chrome's three-dot menu.
3. Choose **Install app** or **Add to Home screen**, if shown.
4. Launch Pocket Money from the new home-screen icon.

The app requires HTTPS for service-worker/PWA features. GitHub Pages provides HTTPS.

## 4. Important data limitation

This version saves salary, budgets, expenses and goals in the browser's local storage on the current device. It does **not** yet synchronize between devices or accounts. Clearing browser data can erase records, so use **Export backup** regularly and keep the JSON backup somewhere safe.

Do not treat this local-only version as a bank-connected or cloud-backed financial records service. Cross-device sync requires a secure backend API, per-user authentication, a production database, authorization checks, and deployment of that backend separately.

## 5. Backend and secret management

The repository also contains the existing FALCONS AI Node.js backend. The Pocket Money PWA does not currently call that backend. Do not add API keys, passwords, or `.env` files to the frontend or commit secrets to GitHub. Configure production secrets only through the chosen hosting provider's environment-variable settings.

## 6. Updating the app

Commit changes under `frontend/` to the `main` branch. GitHub Actions will rebuild and redeploy the site. You can also manually run the workflow from the Actions tab.
