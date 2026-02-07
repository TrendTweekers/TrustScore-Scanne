import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@shopify/polaris/build/esm/styles.css';
import './index.css';

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
