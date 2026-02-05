# Deploying TrustScore Scanner to Railway

This project is configured for easy deployment on [Railway](https://railway.app/).

## Prerequisites

1.  A Railway account.
2.  A Shopify Partner account and a created App.
3.  (Optional) An Anthropic API Key for AI features.

## Deployment Steps

1.  **Create a New Project on Railway**
    *   Go to your Railway Dashboard.
    *   Click "New Project" -> "Deploy from GitHub repo".
    *   Select this repository.

2.  **Configure Environment Variables**
    *   Once the project is created, go to the "Settings" or "Variables" tab.
    *   Add the following variables:

    | Variable | Description |
    | :--- | :--- |
    | `SHOPIFY_API_KEY` | Your Shopify App API Key (Client ID). |
    | `SHOPIFY_API_SECRET` | Your Shopify App API Secret. |
    | `SCOPES` | `read_products,read_themes,write_themes` |
    | `HOST` | The public URL of your Railway app (e.g. `https://your-app.up.railway.app`). |
    | `ANTHROPIC_API_KEY` | (Optional) For AI analysis features. |
    | `NPM_CONFIG_PRODUCTION` | `false` (Ensures devDependencies like Vite are installed for the build step). |

    *   **Note on `HOST`**: You might need to deploy first to get the URL, then update this variable and redeploy. Or use a custom domain.

3.  **Database Configuration (Persistent Storage)**
    *   By default, Railway uses ephemeral file systems. This means **SQLite data will be lost on restart**.
    *   **Recommended**: Add a **Redis** service in Railway for sessions.
        *   Railway will automatically provide `REDIS_URL`. The app is already configured to use it.
    *   **For Persistent Data (Shops/Scans)**:
        *   Add a Volume in Railway.
        *   Mount it to a path, e.g., `/app/data`.
        *   Set the environment variable `DATABASE_PATH` to `/app/data/trustscore.db`.

4.  **Update Shopify App Settings**
    *   Go to your Shopify Partner Dashboard -> Apps -> [Your App] -> Configuration.
    *   Update **App URL** to your Railway URL (e.g., `https://your-app.up.railway.app`).
    *   Update **Allowed redirection URL(s)** to include:
        *   `https://your-app.up.railway.app/api/auth/callback`
        *   `https://your-app.up.railway.app/api/auth` (sometimes needed)

## Troubleshooting

*   **Build Failures**: Check the "Build Logs" in Railway. Ensure `npm install` and `npm run build` are executing correctly.
*   **Puppeteer/Chromium Errors**: The project uses `nixpacks.toml` to install Chromium. If you see errors about missing libraries, ensure the `PUPPETEER_EXECUTABLE_PATH` variable is set correctly (default is `/usr/bin/chromium`).
*   **Session Errors**: If you see session issues, ensure `Redis` is connected or that you understand the limitations of ephemeral SQLite storage.
