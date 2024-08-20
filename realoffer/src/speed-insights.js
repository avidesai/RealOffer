// src/speed-insights.js

import { useEffect } from 'react';
import injectSpeedInsights from '@vercel/speed-insights';

export default function useSpeedInsights() {
  useEffect(() => {
    injectSpeedInsights(); // Call the function directly
  }, []);
}
