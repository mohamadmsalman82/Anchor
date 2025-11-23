import { InsightEngine } from '../services/insightEngine';
import { prisma } from '../config/database';

async function main() {
  const userId = 'cmi6e6xps000012gmg97jp36y';
  console.log('Generating analytics for:', userId);
  
  try {
    const analytics = await InsightEngine.generateHomeAnalytics(userId);
    console.log('Success:', JSON.stringify(analytics, null, 2));
  } catch (error) {
    console.error('Failed:', error);
  }
}

main();

