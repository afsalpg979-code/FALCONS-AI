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

## Target management

Pocket Money supports multiple targets, including savings goals and payment obligations such as course fees. Each target can have a total amount, starting month, deadline, initial saved/paid amount, and dated contribution records. The target card shows progress, remaining amount, deadline status, and an estimated monthly contribution. Target contribution history is included in the monthly report table and CSV/JSON exports.

Example for a ₹60,000 course fee with ₹20,000 already paid: remaining amount is ₹40,000. If planned from November 2026 through March 2027 (five months), the simple estimate is ₹8,000 per month. If including October 2026 through March 2027 (six months), it is about ₹6,667 per month. These are arithmetic estimates only; enter actual income and essential expenses to judge affordability.

## 4. Important data limitation

This version saves salary, budgets, expenses and goals in the browser's local storage on the current device. It does **not** yet synchronize between devices or accounts. Clearing browser data can erase records, so use **Export backup** regularly and keep the JSON backup somewhere safe.

Do not treat this local-only version as a bank-connected or cloud-backed financial records service. Cross-device sync requires a secure backend API, per-user authentication, a production database, authorization checks, and deployment of that backend separately.

## 5. Backend and secret management

The repository also contains the existing FALCONS AI Node.js backend. The Pocket Money PWA does not currently call that backend. Do not add API keys, passwords, or `.env` files to the frontend or commit secrets to GitHub. Configure production secrets only through the chosen hosting provider's environment-variable settings.

## 6. Updating the app

Commit changes under `frontend/` to the `main` branch. GitHub Actions will rebuild and redeploy the site. You can also manually run the workflow from the Actions tab.
