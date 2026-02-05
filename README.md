# TrustScore Scanner

A Shopify app that analyzes merchant stores for trust signals and conversion optimization.

## Tech Stack

- **Backend**: Node.js, Express, Puppeteer, PostgreSQL (planned)
- **Frontend**: React, Shopify Polaris
- **Tools**: Vite, Shopify App Express

## Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Copy `.env.example` to `.env` and fill in your Shopify API credentials.
    ```bash
    cp .env.example .env
    ```

3.  **Run the app**:
    - For development (backend with nodemon):
      ```bash
      npm run dev
      ```
    - For building frontend:
      ```bash
      npm run build
      ```
    - For production start:
      ```bash
      npm start
      ```

## File Structure

- `/backend`: Server logic, routes, and services.
- `/frontend`: React application with Polaris components.
